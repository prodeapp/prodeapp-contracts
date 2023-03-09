// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

interface IManager {
    function creator() external returns(address payable);
    function creatorFee() external returns(uint256);
    function protocolTreasury() external returns(address payable);
    function protocolFee() external returns(uint256);
    function market() external returns(address payable);

    function initialized() external returns(bool);
    function managerRewardDistributed() external returns(bool);
    function claimed(address) external returns(bool);
    function amountClaimed() external returns(uint256);
    function creatorReward() external returns(uint256);
    function protocolReward() external returns(uint256);
	
    function distributeRewards() external;

    function executeCreatorRewards() external;

    function executeProtocolRewards() external;

    function claimReferralReward(address _referral) external;

    function distributeSurplus() external;

    function distributeERC20(address _token) external;
}
