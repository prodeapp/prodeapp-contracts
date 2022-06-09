pragma solidity 0.8.9;

interface ICurate {
    function isRegistered(bytes32 _itemID) external view returns(bool);
	function getAddress(bytes32 _itemID) external view returns(address);
}

contract FirstPriceAuction {

	struct Bid {
		bytes32 previousBidPointer;
		bytes32 nextBidPointer;
		address bidder;
		uint64 startTimestamp;
		uint256 bidPerSecond;
		uint256 balance;
		bytes32 itemID; // on curate
		address market;
		//bytes32 adID;
		//bytes32 tokenID;
	}

	bytes32 public constant QUEUE_START = 0x0000000000000000000000000000000000000000000000000000000000000000;
	bytes32 public constant QUEUE_END = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF;

	ICurate public curate;
	//mapping(bytes32 => bytes32) public currentHeighestBid;
	mapping(bytes32 => Bid) public bids;

    constructor(ICurate _curate) {
		curate = _curate;
	}

	function placeBid(
		bytes32 _itemID,
		address _market,
		//bytes32 _tokenID,
		//bytes32 _adID,
		uint256 _bidPerSecond,
		bytes32 _startLookupBidID
	) external payable {
		require(curate.isRegistered(_itemID), "Item must be registered");
		bytes32 bidID = keccak256(abi.encode(_market, _itemID, msg.sender, _bidPerSecond));
		bytes32 startID = keccak256(abi.encode(_market, QUEUE_START));
		Bid storage startElement = bids[startID];
		if (startElement.nextBidPointer == 0x0) {
			// New hightest bid!
			startElement.nextBidPointer = bidID;
			Bid storage newBid = bids[bidID];
			newBid.previousBidPointer = startID;
			newBid.bidder = msg.sender;
			newBid.startTimestamp = uint64(block.timestamp);
			newBid.bidPerSecond = _bidPerSecond; // min?
			newBid.balance = msg.value; // min?
			newBid.itemID = _itemID;
			newBid.market = _market;
		} else {
			bytes32 currentID = startID;
			bytes32 nextID = startElement.nextBidPointer;
			while (bids[nextID].bidPerSecond > _bidPerSecond) {
				currentID = nextID;
				nextID = bids[nextID].nextBidPointer;
			}
			bids[currentID].nextBidPointer = bidID;
			bids[nextID].previousBidPointer = bidID;

			Bid storage newBid = bids[bidID];
			newBid.previousBidPointer = currentID;
			newBid.nextBidPointer = nextID;
			newBid.bidder = msg.sender;
			newBid.startTimestamp = uint64(block.timestamp);
			newBid.bidPerSecond = _bidPerSecond; // min?
			newBid.balance = msg.value; // min?
			newBid.itemID = _itemID;
			newBid.market = _market;

		}

	}

	function increaseBalance() external payable {

	}

	function updateBid(bytes32 _itemID, address _market, bytes32 _tokenID, uint256 _bidPerSecond) external {

	}

	function removeBid() external {

	}

	function reportOldBid(address _market, bytes32 _tokenID, bytes32 _adID) external {
		
	}

	function getAd(address _market, bytes32 _tokenID, bytes32 _adID) external view returns(string memory svg) {
		// fetch item on curate
		// get svg contract address
		// retrieve return svg
	}

	function findPositionForBid(address _market, bytes32 _tokenID, bytes32 _adID, uint256 _bidPerSecond) external view returns(bytes32) {

	}
}