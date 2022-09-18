// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "./Base64AdMock.sol";

contract Base64AdFactoryMock {
    using Clones for address;

    Base64AdMock[] public ads;
    address public immutable adContract;

    event NewAd(address indexed ad);

    /**
     *  @dev Constructor.
     *  @param _adContract Address of the base64 ad contract that is going to be used for each new deployment.
     */
    constructor(address _adContract) {
        adContract = _adContract;
    }

    function createAd(string memory svg) external returns (address) {
        Base64AdMock instance = Base64AdMock(adContract.clone());
        instance.setSVG(svg);

        emit NewAd(address(instance));
        ads.push(instance);

        return address(instance);
    }

    function allAds() external view returns (Base64AdMock[] memory) {
        return ads;
    }

    function adCount() external view returns (uint256) {
        return ads.length;
    }
}
