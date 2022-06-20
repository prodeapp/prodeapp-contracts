pragma solidity 0.8.9;

interface ICurate {
    function isRegistered(bytes32 _itemID) external view returns(bool);
	function getAddress(bytes32 _itemID) external view returns(address);
}

interface ISVGContract {
	function getSVG() external view returns(string memory);
}

// v2 tokenID and adID

contract FirstPriceAuction {

	struct Bid {
		bytes32 previousBidPointer;
		bytes32 nextBidPointer;
		address bidder;
		uint64 startTimestamp;
		bool removed;
		uint256 bidPerSecond;
		uint256 balance;
		bytes32 itemID; // on curate
		address market;
	}

	bytes32 public constant QUEUE_START = 0x0000000000000000000000000000000000000000000000000000000000000000;
	uint256 public constant MIN_OFFER_DURATION = 60; // 1 min

	ICurate public curate;
	address payable public billing;
	//mapping(bytes32 => bytes32) public currentHeighestBid;
	mapping(bytes32 => Bid) public bids;

    constructor(ICurate _curate) {
		curate = _curate;
	}

	function placeBid(
		bytes32 _itemID,
		address _market,
		uint256 _bidPerSecond
	) external payable {
		require(msg.value / _bidPerSecond > MIN_OFFER_DURATION, "Not enough funds");
		require(curate.isRegistered(_itemID), "Item must be registered");

		bytes32 bidID = keccak256(abi.encode(_market, _itemID, msg.sender));
		Bid storage newBid = bids[bidID];
		require(newBid.bidder == address(0x0) || newBid.removed, "Bid is active");
		newBid.bidder = msg.sender;
		newBid.bidPerSecond = _bidPerSecond;
		newBid.balance = msg.value;
		newBid.itemID = _itemID;
		newBid.market = _market;
		newBid.removed = false;

		_insertBid(_market, bidID);
	}

	function increaseBalance(bytes32 _itemID, address _market) external payable {
		bytes32 bidID = keccak256(abi.encode(_market, _itemID, msg.sender));
		Bid storage bid = bids[bidID];
		bid.balance += msg.value;
		require(curate.isRegistered(_itemID), "Item must be registered");
		require(bid.bidder == msg.sender, "Bid does not exist");
		require(bid.balance / bid.bidPerSecond > MIN_OFFER_DURATION, "Not enough funds");

		if (bid.removed) {
			bid.removed = false;
			_insertBid(_market, bidID);
		}
	}

	function updateBid(bytes32 _itemID, address _market, uint256 _bidPerSecond) external payable {
		bytes32 bidID = keccak256(abi.encode(_market, _itemID, msg.sender));
		Bid storage bid = bids[bidID];
		require(curate.isRegistered(_itemID), "Item must be registered");
		require(bid.bidder == msg.sender, "Bid does not exist");

		bytes32 startID = keccak256(abi.encode(_market, QUEUE_START));
		if (bid.previousBidPointer == startID && !bid.removed) {
			// send balance back
			uint256 price = (block.timestamp - bid.startTimestamp) * bid.bidPerSecond;
			uint256 bill = price > bid.balance ? bid.balance : price;
			bid.startTimestamp = 0;
			bid.balance -= bill;
			billing.send(bill);

			if (bid.nextBidPointer != 0x0) {
				Bid storage newHighestBid = bids[bid.nextBidPointer];
				newHighestBid.startTimestamp = uint64(block.timestamp);
			}
		}

		bid.balance += msg.value;
		require(bid.balance / _bidPerSecond > MIN_OFFER_DURATION, "Not enough funds");
		bid.bidPerSecond = _bidPerSecond;

		// force remove and insert back
		bids[bid.nextBidPointer].previousBidPointer = bid.previousBidPointer;
		bids[bid.previousBidPointer].nextBidPointer = bid.nextBidPointer;
		bid.previousBidPointer = 0x0;
		bid.nextBidPointer = 0x0;
		bid.removed = false;
		_insertBid(_market, bidID);
	}

	function removeBid(bytes32 _itemID, address _market) external {
		bytes32 bidID = keccak256(abi.encode(_market, _itemID, msg.sender));
		Bid storage bid = bids[bidID];
		require(bid.bidder == msg.sender, "Bid does not exist");
		require(!bid.removed, "Bid already removed");
		bid.removed = true;
		bids[bid.nextBidPointer].previousBidPointer = bid.previousBidPointer;
		bids[bid.previousBidPointer].nextBidPointer = bid.nextBidPointer;

		bytes32 startID = keccak256(abi.encode(_market, QUEUE_START));
		if (bid.previousBidPointer == startID) {
			// send balance back
			uint256 price = (block.timestamp - bid.startTimestamp) * bid.bidPerSecond;
			uint256 bill = price > bid.balance ? bid.balance : price;
			bid.startTimestamp = 0;
			bid.balance -= bill;
			billing.send(bill);

			if (bid.nextBidPointer != 0x0) {
				Bid storage newHighestBid = bids[bid.nextBidPointer];
				newHighestBid.startTimestamp = uint64(block.timestamp);
			}
		}

		payable(msg.sender).send(bid.balance);
		bid.balance = 0;
	}

	function reportBid(address _market) public {
		bytes32 startID = keccak256(abi.encode(_market, QUEUE_START));
		bytes32 highestBidID = bids[startID].nextBidPointer;
		require(highestBidID != 0x0, "No bid found");

		Bid storage highestBid = bids[highestBidID];
		highestBid.removed = true;
		bids[highestBid.nextBidPointer].previousBidPointer = highestBid.previousBidPointer;
		bids[highestBid.previousBidPointer].nextBidPointer = highestBid.nextBidPointer;
		
		// send balance back
		uint256 price = (block.timestamp - highestBid.startTimestamp) * highestBid.bidPerSecond;
		require(
			price >= highestBid.balance || !curate.isRegistered(highestBid.itemID), 
			"Highest bid is still active"
		);
		highestBid.startTimestamp = 0;
		billing.send(highestBid.balance);
		highestBid.balance = 0;

		if (highestBid.nextBidPointer != 0x0) {
			Bid storage newHighestBid = bids[highestBid.nextBidPointer];
			newHighestBid.startTimestamp = uint64(block.timestamp);
		}
	}

	function _insertBid(address _market, bytes32 _bidID) internal {
		// Insert the bid in the ordered list.
		Bid storage bid = bids[_bidID];
		bytes32 startID = keccak256(abi.encode(_market, QUEUE_START));
		Bid storage startElement = bids[startID];
		bytes32 currentID = startID;
		bytes32 nextID = startElement.nextBidPointer;
		while (bids[nextID].bidPerSecond > bid.bidPerSecond) {
			currentID = nextID;
			nextID = bids[nextID].nextBidPointer;
		}
		bids[currentID].nextBidPointer = _bidID;
		bid.previousBidPointer = currentID;
		bid.nextBidPointer = nextID;
		bids[nextID].previousBidPointer = _bidID;

		if (currentID == startID) {
			// Hightest bid! Activate the new bid and process the previous highest bid.
			bid.startTimestamp = uint64(block.timestamp);

			if (nextID != 0x0) {
				uint256 price = (block.timestamp - bids[nextID].startTimestamp) * bids[nextID].bidPerSecond;
				uint256 bill = price > bids[nextID].balance ? bids[nextID].balance : price;
				bids[nextID].startTimestamp = 0;
				bids[nextID].balance -= bill;
				billing.send(bill);

				if (bids[nextID].balance == 0) {
					// remove bid from list.
					bids[nextID].removed = true;
					bids[bids[nextID].nextBidPointer].previousBidPointer = _bidID;
					bids[_bidID].nextBidPointer = bids[nextID].nextBidPointer;

				}
			}
		}
	}

	function getAd(address _market) external view returns(string memory) {
		bytes32 startID = keccak256(abi.encode(_market, QUEUE_START));
		bytes32 highestBidID = bids[startID].nextBidPointer;
		if (highestBidID == 0x0) {
			return "";
		} else {
			Bid storage bid = bids[highestBidID];
			ISVGContract svgContract = ISVGContract(curate.getAddress(bid.itemID));
			return svgContract.getSVG();
		}
	}
}