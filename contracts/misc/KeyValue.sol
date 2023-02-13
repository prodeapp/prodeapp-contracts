// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../interfaces/IMarket.sol";

contract KeyValue {

    address public owner = msg.sender;
    address public marketFactoryV2;
    mapping(address => string) public username;
    mapping(string => bool) public usernameExists;
    mapping(address => address) public marketCreator;
    mapping(address => bool) public marketDeleted;

    event SetUsername(address userId, string username);
    event SetMarketCreator(address marketId, address creator);
    event MarketDeleted(address marketId);

    function changeOwner(address _owner) external {
        require(msg.sender == owner, "Not authorized");
        owner = _owner;
    }

    function changeMarketFactory(address _marketFactoryV2) external {
        require(msg.sender == owner, "Not authorized");
        marketFactoryV2 = _marketFactoryV2;
    }

    function setUsername(address userId, string calldata name) public {
        require(!usernameExists[name], "Username already exists");
        require(userId == msg.sender || msg.sender == owner, "Unable to set username");

        usernameExists[username[userId]] = false;
        usernameExists[name] = true;

        username[userId] = name;

        emit SetUsername(userId, name);
    }

    function setUsernames(address[] calldata userIds, string[] calldata names) external {
        uint256 count = userIds.length;
        for (uint256 i = 0; i < count; i++) {
            setUsername(userIds[i], names[i]);
        }
    }

    function setMarketCreator(address marketId, address creator) external {
        require(msg.sender == marketFactoryV2, "Not market factory");

        marketCreator[marketId] = creator;

        emit SetMarketCreator(marketId, creator);
    }

    function deleteMarket(address marketId) public {
        require(msg.sender == marketCreator[marketId] || msg.sender == owner, "Not creator");
        require(marketId.balance == 0 && IMarket(marketId).nextTokenID() == 0, "Market has bets");

        marketDeleted[marketId] = true;

        emit MarketDeleted(marketId);
    }

    function deleteMarkets(address[] calldata marketIds) external {
        uint256 count = marketIds.length;
        for (uint256 i = 0; i < count; i++) {
            deleteMarket(marketIds[i]);
        }
    }
}
