// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

interface ICurate {
    function isRegistered(bytes32 _itemID) external view returns (bool);

    function getAddress(bytes32 _itemID) external view returns (address);
}

interface ISVGContract {
    function getSVG() external view returns (string memory);
}

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
    }

    bytes32 public constant QUEUE_START =
        0x0000000000000000000000000000000000000000000000000000000000000000;
    uint256 public constant MIN_OFFER_DURATION = 300; // 5 min

    ICurate public curatedAds;
    address payable public billing;
    mapping(bytes32 => Bid) public bids;

    constructor(ICurate _curatedAds) {
        curatedAds = _curatedAds;
    }

    /** @dev Creates and places a new bid or replaces one that has been removed.
     *  @param _itemID The id of curated ad.
     *  @param _market The address of the market the bid will be placed to.
     *  @param _bidPerSecond The amount of tokens (xDAI) per second that will be payed if the bid gets the highest position, now or at some point.
     */
    function placeBid(
        bytes32 _itemID,
        address _market,
        uint256 _bidPerSecond
    ) external payable {
        require(
            msg.value / _bidPerSecond > MIN_OFFER_DURATION,
            "Not enough funds"
        );
        require(curatedAds.isRegistered(_itemID), "Item must be registered");

        bytes32 bidID = keccak256(abi.encode(_market, _itemID, msg.sender));
        Bid storage newBid = bids[bidID];
        require(
            newBid.bidder == address(0x0) || newBid.removed,
            "Bid is active"
        );
        newBid.bidder = msg.sender;
        newBid.bidPerSecond = _bidPerSecond;
        newBid.balance = msg.value;
        newBid.itemID = _itemID;
        newBid.removed = false;

        _insertBid(_market, bidID);
    }

    /** @dev Increases the balance of an existing bid. If the bid was removed, it is inserted back.
     *  @param _itemID The id of curated ad.
     *  @param _market The address of the market the bid will be placed to.
     */
    function increaseBalance(bytes32 _itemID, address _market)
        external
        payable
    {
        bytes32 bidID = keccak256(abi.encode(_market, _itemID, msg.sender));
        Bid storage bid = bids[bidID];
        bid.balance += msg.value;
        require(curatedAds.isRegistered(_itemID), "Item must be registered");
        require(bid.bidder == msg.sender, "Bid does not exist");
        require(
            bid.balance / bid.bidPerSecond > MIN_OFFER_DURATION,
            "Not enough funds"
        );

        if (bid.removed) {
            bid.removed = false;
            _insertBid(_market, bidID);
        }
    }

    /** @dev Places a new bid or replaces one that has been removed.
     *  @param _itemID The id of curated ad.
     *  @param _market The address of the market the bid will be placed to.
     *  @param _bidPerSecond The amount of tokens (xDAI) per second that will be payed if the bid gets the highest position, now or at some point.
     */
    function updateBid(
        bytes32 _itemID,
        address _market,
        uint256 _bidPerSecond
    ) external payable {
        bytes32 bidID = keccak256(abi.encode(_market, _itemID, msg.sender));
        Bid storage bid = bids[bidID];
        require(curatedAds.isRegistered(_itemID), "Item must be registered");
        require(bid.bidder == msg.sender, "Bid does not exist");

        if (!bid.removed) {
            bytes32 startID = keccak256(abi.encode(_market, QUEUE_START));
            if (bid.previousBidPointer == startID) {
                uint256 price = (block.timestamp - bid.startTimestamp) *
                    bid.bidPerSecond;
                uint256 bill = price > bid.balance ? bid.balance : price;
                bid.startTimestamp = 0;
                bid.balance -= bill;
                billing.send(bill);

                if (bid.nextBidPointer != 0x0) {
                    Bid storage newHighestBid = bids[bid.nextBidPointer];
                    newHighestBid.startTimestamp = uint64(block.timestamp);
                }
            }

            // force remove
            bids[bid.nextBidPointer].previousBidPointer = bid
                .previousBidPointer;
            bids[bid.previousBidPointer].nextBidPointer = bid.nextBidPointer;
        }

        bid.balance += msg.value;
        require(
            bid.balance / _bidPerSecond > MIN_OFFER_DURATION,
            "Not enough funds"
        );
        bid.bidPerSecond = _bidPerSecond;

        // Insert back
        bid.removed = false;
        _insertBid(_market, bidID);
    }

    /** @dev Removes an existing bid.
     *  @param _itemID The id of curated ad.
     *  @param _market The address of the market the bid will be placed to.
     */
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
            uint256 price = (block.timestamp - bid.startTimestamp) *
                bid.bidPerSecond;
            uint256 bill = price > bid.balance ? bid.balance : price;
            bid.startTimestamp = 0;
            bid.balance -= bill;
            billing.send(bill);

            if (bid.nextBidPointer != 0x0) {
                Bid storage newHighestBid = bids[bid.nextBidPointer];
                newHighestBid.startTimestamp = uint64(block.timestamp);
            }
        }

        uint256 remainingBalance = bid.balance;
        bid.balance = 0;
        payable(msg.sender).send(remainingBalance);
    }

    /** @dev Removes the current highest bid if the balance is empty or if it was removed from curate.
     *  @param _market The address of the market.
     */
    function reportBid(address _market) public {
        bytes32 startID = keccak256(abi.encode(_market, QUEUE_START));
        bytes32 highestBidID = bids[startID].nextBidPointer;
        require(highestBidID != 0x0, "No bid found");

        Bid storage highestBid = bids[highestBidID];
        highestBid.removed = true;
        bids[highestBid.nextBidPointer].previousBidPointer = highestBid
            .previousBidPointer;
        bids[highestBid.previousBidPointer].nextBidPointer = highestBid
            .nextBidPointer;

        uint256 price = (block.timestamp - highestBid.startTimestamp) *
            highestBid.bidPerSecond;
        require(
            price >= highestBid.balance ||
                !curatedAds.isRegistered(highestBid.itemID),
            "Highest bid is still active"
        );
        highestBid.startTimestamp = 0;
        uint256 remainingBalance = highestBid.balance;
        highestBid.balance = 0;
        billing.send(remainingBalance);

        if (highestBid.nextBidPointer != 0x0) {
            Bid storage newHighestBid = bids[highestBid.nextBidPointer];
            newHighestBid.startTimestamp = uint64(block.timestamp);
        }
    }

    /** @dev Collects the current highest bid billing.
     *  @param _market The address of the market.
     */
    function collectPayment(address _market) public {
        bytes32 startID = keccak256(abi.encode(_market, QUEUE_START));
        bytes32 highestBidID = bids[startID].nextBidPointer;
        require(highestBidID != 0x0, "No bid found");

        Bid storage highestBid = bids[highestBidID];
        uint256 price = (block.timestamp - highestBid.startTimestamp) *
            highestBid.bidPerSecond;
        require(price < highestBid.balance, "Highest bid is still active");
        highestBid.startTimestamp = uint64(block.timestamp);
        highestBid.balance -= price;
        billing.send(price);
    }

    function _insertBid(address _market, bytes32 _bidID) internal {
        // Insert the bid in the ordered list.
        Bid storage bid = bids[_bidID];
        bytes32 startID = keccak256(abi.encode(_market, QUEUE_START));
        Bid storage startElement = bids[startID];
        bytes32 currentID = startID;
        bytes32 nextID = startElement.nextBidPointer;
        while (bids[nextID].bidPerSecond >= bid.bidPerSecond) {
            currentID = nextID;
            nextID = bids[nextID].nextBidPointer;
        }
        bids[currentID].nextBidPointer = _bidID;
        bid.previousBidPointer = currentID;
        bid.nextBidPointer = nextID;
        bids[nextID].previousBidPointer = _bidID;

        if (currentID == startID) {
            // Highest bid! Activate the new bid and process the previous highest bid.
            bid.startTimestamp = uint64(block.timestamp);

            if (nextID != 0x0) {
                uint256 price = (block.timestamp -
                    bids[nextID].startTimestamp) * bids[nextID].bidPerSecond;
                uint256 bill = price > bids[nextID].balance
                    ? bids[nextID].balance
                    : price;
                bids[nextID].startTimestamp = 0;
                bids[nextID].balance -= bill;
                billing.send(bill);

                if (bids[nextID].balance == 0) {
                    // remove bid from list.
                    bids[nextID].removed = true;
                    bids[bids[nextID].nextBidPointer]
                        .previousBidPointer = _bidID;
                    bid.nextBidPointer = bids[nextID].nextBidPointer;
                }
            }
        }
    }

    function getAd(address _market) external view returns (string memory) {
        bytes32 startID = keccak256(abi.encode(_market, QUEUE_START));
        bytes32 highestBidID = bids[startID].nextBidPointer;
        if (highestBidID == 0x0) {
            return "";
        } else {
            Bid storage bid = bids[highestBidID];
            // Look for highest bid?
            address svgAddress = curatedAds.getAddress(bid.itemID);
            try ISVGContract(svgAddress).getSVG() returns (string memory svg) {
                return svg;
            } catch {
                return "";
            }
        }
    }
}
