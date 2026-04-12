// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

interface ICurate {
    function isRegistered(bytes32 _itemID) external view returns (bool);

    function getAddress(bytes32 _itemID) external view returns (address);
}

interface ISVG {
    function getSVG(address _market, uint256 _tokenID) external view returns (string memory);

    function getRef(address _market, uint256 _tokenID) external view returns (string memory);
}

interface IBilling {
    function registerPayment(address _market) external payable;
}

/** @title FirstPriceAuction
 *  @dev Continuous first-price auction for ad slots on prediction markets' NFT positions.
 *  Bidders deposit xDAI and set a `bidPerSecond` rate. The highest bidder's ad is displayed
 *  and charged `bidPerSecond * elapsed` while active. When their balance runs out or their
 *  curate item is deregistered, the next highest bidder takes over.
 *
 *  Bids are stored in a per-market doubly-linked list sorted descending by `bidPerSecond`.
 *  - Sentinel (head) node: bids[keccak256(abi.encode(market))].
 *  - Bid ID: keccak256(abi.encode(market, itemID, sender)) — one bid per (market, item, bidder).
 *  - List terminator: 0x0 (end of list).
 *  Only the highest bid (sentinel.nextBidPointer) accrues charges.
 */
contract FirstPriceAuction {
    struct Bid {
        bytes32 previousBidPointer;
        bytes32 nextBidPointer;
        address bidder;
        uint64 startTimestamp; // When this bid last became the highest. Only meaningful for the active highest bid.
        bool removed;
        uint256 bidPerSecond;
        uint256 balance;
        bytes32 itemID; // on curate
    }

    /// @dev Minimum seconds a bid must be fundable for. Prevents spam bids that drain immediately.
    uint256 public constant MIN_OFFER_DURATION = 1800;

    ICurate public curatedAds;
    IBilling public billing;
    mapping(bytes32 => Bid) public bids;

    event BidUpdate(
        address indexed _market,
        address indexed _bidder,
        bytes32 _itemID,
        uint256 indexed _bidPerSecond,
        uint256 _newBalance
    );

    event NewHighestBid(address indexed _market, address _bidder, bytes32 _itemID);

    constructor(ICurate _curatedAds, IBilling _billing) {
        curatedAds = _curatedAds;
        billing = _billing;
    }

    /** @dev Creates a new bid, tops up an existing one, or re-places a bid with a new rate.
     *  Handles three cases based on bid state:
     *  - New/removed bid: inserts into the sorted list.
     *  - Active bid, same rate: tops up balance without moving list position.
     *  - Active bid, different rate: removes from old position, re-inserts at new position.
     *  @param _itemID The id of the curated ad on the Curate registry.
     *  @param _market The address of the market to bid on.
     *  @param _bidPerSecond The xDAI per second rate charged while this bid is the highest.
     */
    function placeBid(
        bytes32 _itemID,
        address _market,
        uint256 _bidPerSecond
    ) external payable {
        executeHighestBid(_market);

        require(curatedAds.isRegistered(_itemID), "Item must be registered");

        bytes32 bidID = keccak256(abi.encode(_market, _itemID, msg.sender));
        Bid storage bid = bids[bidID];

        // If rate unchanged, just top up balance without touching the list.
        bool increaseBalanceOnly = bid.bidPerSecond == _bidPerSecond;
        // Active bid with changed rate: remove from old position before re-inserting.
        if (bid.bidder == msg.sender && !bid.removed && !increaseBalanceOnly) {
            _forceRemoveBid(_itemID, _market);
        }

        bid.bidPerSecond = _bidPerSecond;
        bid.balance += msg.value;
        bid.itemID = _itemID;
        require(bid.balance / _bidPerSecond > MIN_OFFER_DURATION, "Not enough funds");

        // Insert into list if: new bid, previously removed, or rate changed.
        if (bid.bidder != msg.sender || bid.removed || !increaseBalanceOnly) {
            _insertBid(_market, bidID);
        }
        bid.removed = false;
        bid.bidder = msg.sender;

        emit BidUpdate(_market, msg.sender, _itemID, _bidPerSecond, bid.balance);
    }

    /** @dev Removes a bid from the linked list without settling payment or marking it as removed.
     *  Only called from placeBid when re-placing with a different rate. Safe because:
     *  - executeHighestBid already settled charges earlier in the same tx (elapsed = 0).
     *  - _insertBid immediately re-inserts the bid, so `removed` stays false.
     *  @param _itemID The id of the curated ad.
     *  @param _market The market address.
     */
    function _forceRemoveBid(bytes32 _itemID, address _market) internal {
        bytes32 bidID = keccak256(abi.encode(_market, _itemID, msg.sender));
        Bid storage bid = bids[bidID];

        bytes32 startID = keccak256(abi.encode(_market));
        // If removing the highest bid, activate the next one.
        if (bid.previousBidPointer == startID) {
            if (bid.nextBidPointer != 0x0) {
                Bid storage newHighestBid = bids[bid.nextBidPointer];
                newHighestBid.startTimestamp = uint64(block.timestamp);
                emit NewHighestBid(_market, newHighestBid.bidder, newHighestBid.itemID);
            }
        }

        bids[bid.nextBidPointer].previousBidPointer = bid.previousBidPointer;
        bids[bid.previousBidPointer].nextBidPointer = bid.nextBidPointer;
    }

    /** @dev Removes a bid from the market and refunds the remaining balance.
     *  If the bid was the highest, accrued charges are settled before refunding.
     *  Non-highest bids have no accrued charges and are refunded in full.
     *  @param _itemID The id of the curated ad.
     *  @param _market The market address.
     */
    function removeBid(bytes32 _itemID, address _market) external {
        bytes32 bidID = keccak256(abi.encode(_market, _itemID, msg.sender));
        Bid storage bid = bids[bidID];
        require(bid.bidder == msg.sender, "Bid does not exist");
        require(!bid.removed, "Bid already removed");
        bid.removed = true;
        bids[bid.nextBidPointer].previousBidPointer = bid.previousBidPointer;
        bids[bid.previousBidPointer].nextBidPointer = bid.nextBidPointer;

        bytes32 startID = keccak256(abi.encode(_market));
        if (bid.previousBidPointer == startID) {
            // Was the highest bid — settle accrued charges. This reduces bid.balance.
            _registerPayment(bid, _market);

            if (bid.nextBidPointer != 0x0) {
                Bid storage newHighestBid = bids[bid.nextBidPointer];
                newHighestBid.startTimestamp = uint64(block.timestamp);
                emit NewHighestBid(_market, newHighestBid.bidder, newHighestBid.itemID);
            }
        }

        emit BidUpdate(_market, msg.sender, _itemID, bid.bidPerSecond, 0);

        // Refund post-billing remainder. balance is zeroed before the external call (CEI).
        uint256 remainingBalance = bid.balance;
        bid.balance = 0;
        requireSendXDAI(payable(msg.sender), remainingBalance);
    }

    /** @dev Settles the current highest bid for a market. Two outcomes:
     *  - Drain: if balance is exhausted or curate item deregistered, the bid is removed
     *    and its entire remaining balance is sent to billing.
     *  - Collect: otherwise, accrued charges are collected and the bid continues.
     *  Called automatically at the start of placeBid. Can also be called externally.
     *  Only processes one bid per call — if the next bid is also drained, another call is needed.
     *  @param _market The market address.
     */
    function executeHighestBid(address _market) public {
        bytes32 startID = keccak256(abi.encode(_market));
        bytes32 highestBidID = bids[startID].nextBidPointer;
        if (highestBidID == 0x0) return;

        Bid storage bid = bids[highestBidID];

        uint256 price = (block.timestamp - bid.startTimestamp) * bid.bidPerSecond;
        if (price >= bid.balance || !curatedAds.isRegistered(bid.itemID)) {
            // Bid is drained or deregistered — remove and forfeit entire balance.
            bid.removed = true;
            bids[bid.nextBidPointer].previousBidPointer = bid.previousBidPointer;
            bids[bid.previousBidPointer].nextBidPointer = bid.nextBidPointer;

            bid.startTimestamp = 0;
            uint256 remainingBalance = bid.balance;
            bid.balance = 0;
            billing.registerPayment{value: remainingBalance}(_market);

            if (bid.nextBidPointer != 0x0) {
                Bid storage newHighestBid = bids[bid.nextBidPointer];
                newHighestBid.startTimestamp = uint64(block.timestamp);
                emit NewHighestBid(_market, newHighestBid.bidder, newHighestBid.itemID);
            }
        } else {
            // Bid is still active — collect accrued charges and reset the billing period.
            bid.startTimestamp = uint64(block.timestamp);
            bid.balance -= price;
            billing.registerPayment{value: price}(_market);
        }

        emit BidUpdate(_market, bid.bidder, bid.itemID, bid.bidPerSecond, bid.balance);
    }

    /** @dev Inserts a bid into the per-market linked list at the correct position (descending by bidPerSecond).
     *  Equal rates are placed after existing bids (FIFO). If the bid becomes the new highest,
     *  the displaced bid's accrued charges are settled and it's removed if fully drained.
     *  @param _market The market address.
     *  @param _bidID The bid's storage key.
     */
    function _insertBid(address _market, bytes32 _bidID) internal {
        Bid storage bid = bids[_bidID];
        bytes32 startID = keccak256(abi.encode(_market));
        bytes32 currentID = startID;
        bytes32 nextID = bids[startID].nextBidPointer;
        // Walk the list until we find a bid with a lower rate (or the end). bids[0x0].bidPerSecond == 0 terminates.
        while (bids[nextID].bidPerSecond >= bid.bidPerSecond) {
            currentID = nextID;
            nextID = bids[nextID].nextBidPointer;
        }
        bids[currentID].nextBidPointer = _bidID;
        bid.previousBidPointer = currentID;
        bid.nextBidPointer = nextID;
        bids[nextID].previousBidPointer = _bidID;

        if (currentID == startID) {
            // New highest bid — start billing from now.
            bid.startTimestamp = uint64(block.timestamp);

            if (nextID != 0x0) {
                // Settle the displaced highest bid's accrued charges.
                Bid storage nextBid = bids[nextID];
                _registerPayment(nextBid, _market);

                if (nextBid.balance == 0) {
                    nextBid.removed = true;
                    bids[nextBid.nextBidPointer].previousBidPointer = _bidID;
                    bid.nextBidPointer = nextBid.nextBidPointer;
                }
                emit BidUpdate(
                    _market,
                    nextBid.bidder,
                    nextBid.itemID,
                    nextBid.bidPerSecond,
                    nextBid.balance
                );
            }
            emit NewHighestBid(_market, msg.sender, bid.itemID);
        }
    }

    /** @dev Settles a bid's accrued charges and sends them to billing. Caps the bill at the
     *  bid's remaining balance to prevent underflow. Resets startTimestamp to 0 since the bid
     *  is no longer the active highest.
     *  @param _bid The bid to settle.
     *  @param _market The market address (forwarded to billing).
     */
    function _registerPayment(Bid storage _bid, address _market) internal {
        uint256 price = (block.timestamp - _bid.startTimestamp) * _bid.bidPerSecond;
        uint256 bill = price > _bid.balance ? _bid.balance : price;
        _bid.startTimestamp = 0;
        _bid.balance -= bill;
        billing.registerPayment{value: bill}(_market);
    }

    /// @dev Transfers xDAI to an address, reverting on failure.
    function requireSendXDAI(address payable _to, uint256 _value) internal {
        (bool success, ) = _to.call{value: _value}(new bytes(0));
        require(success, "Send XDAI failed");
    }

    /** @dev Returns the SVG ad content for the current highest bidder on a market.
     *  Returns empty string if no active bid, the ad contract is an EOA, or the SVG call fails.
     *  @param _market The market address.
     *  @param _tokenID The token ID to render the ad for.
     */
    function getAd(address _market, uint256 _tokenID) external view returns (string memory) {
        bytes32 startID = keccak256(abi.encode(_market));
        bytes32 highestBidID = bids[startID].nextBidPointer;
        if (highestBidID == 0x0) return "";

        Bid storage bid = bids[highestBidID];
        address svgAddress = curatedAds.getAddress(bid.itemID);
        // Check if address is a contract. See @openzeppelin/contracts/utils/Address.sol
        if (svgAddress.code.length == 0) return "";

        try ISVG(svgAddress).getSVG(_market, _tokenID) returns (string memory svg) {
            return svg;
        } catch {
            return "";
        }
    }

    /** @dev Returns the reference URL for the current highest bidder's ad.
     *  @param _market The market address.
     *  @param _tokenID The token ID to get the reference for.
     */
    function getRef(address _market, uint256 _tokenID) external view returns (string memory) {
        bytes32 startID = keccak256(abi.encode(_market));
        bytes32 highestBidID = bids[startID].nextBidPointer;
        if (highestBidID == 0x0) return "";

        Bid storage bid = bids[highestBidID];
        address svgAddress = curatedAds.getAddress(bid.itemID);
        // Check if address is a contract. See @openzeppelin/contracts/utils/Address.sol
        if (svgAddress.code.length == 0) return "";

        try ISVG(svgAddress).getRef(_market, _tokenID) returns (string memory ref) {
            return ref;
        } catch {
            return "";
        }
    }

    /** @dev Returns a paginated slice of bids for a market, ordered by bidPerSecond descending.
     *  @param _market The market address.
     *  @param _from Start index (inclusive, 0-based).
     *  @param _to End index (exclusive). Array size = _to - _from.
     */
    function getBids(
        address _market,
        uint256 _from,
        uint256 _to
    ) external view returns (Bid[] memory) {
        Bid[] memory bidsArray = new Bid[](_to - _from);
        bytes32 startID = keccak256(abi.encode(_market));
        bytes32 nextID = bids[startID].nextBidPointer;

        for (uint256 i = 0; i < _to; i++) {
            if (nextID == 0x0) break;

            if (i >= _from) {
                bidsArray[i - _from] = bids[nextID];
            }

            nextID = bids[nextID].nextBidPointer;
        }

        return bidsArray;
    }
}
