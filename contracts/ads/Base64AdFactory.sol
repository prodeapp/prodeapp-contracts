// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "./Base64Ad.sol";

contract Base64AdFactory {
    using Clones for address;

    Base64Ad[] public ads;
    address public immutable adContract;

    event NewAd(address indexed ad);

    /**
     *  @dev Constructor.
     *  @param _adContract Address of the market contract that is going to be used for each new deployment.
     */
    constructor(address _adContract) {
        adContract = _adContract;
    }

    function createAd(string memory svg) external returns (address) {
        Base64Ad instance = Base64Ad(adContract.clone());
        instance.setSVG(svg);

        emit NewAd(address(instance));
        ads.push(instance);

        return address(instance);
    }

    function allMarkets() external view returns (Base64Ad[] memory) {
        return ads;
    }

    function marketCount() external view returns (uint256) {
        return ads.length;
    }
}
