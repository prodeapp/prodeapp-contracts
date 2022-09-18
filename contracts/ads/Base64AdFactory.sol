// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "./Base64Ad.sol";

contract Base64AdFactory {
    using Clones for address;

    Base64Ad[] public ads;
    address public immutable adContract;
    address public immutable technicalCurate;
    address public immutable contentCurate;
    address public immutable curateProxy;

    event NewAd(address indexed ad);

    /**
     *  @dev Constructor.
     *  @param _adContract Address of the base64 ad contract that is going to be used for each new deployment.
     *  @param _technicalCurate Address of the TCR contract that curates ads techincally.
     *  @param _contentCurate Address of the TCR contract that curates ads content.
     *  @param _curateProxy Address of curate proxy.
     */
    constructor(
        address _adContract,
        address _technicalCurate,
        address _contentCurate,
        address _curateProxy
    ) {
        adContract = _adContract;
        technicalCurate = _technicalCurate;
        contentCurate = _contentCurate;
        curateProxy = _curateProxy;
    }

    function createAd(string memory _ipfsLink, string memory _svg)
        external
        payable
        returns (address)
    {
        Base64Ad instance = Base64Ad(payable(adContract.clone()));
        instance.initialize{value: msg.value}(msg.sender, _ipfsLink, _svg);

        emit NewAd(address(instance));
        ads.push(instance);

        return address(instance);
    }

    function allAds() external view returns (Base64Ad[] memory) {
        return ads;
    }

    function adCount() external view returns (uint256) {
        return ads.length;
    }
}
