// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./../interfaces/IMarket.sol";

interface IERC20 {
    function balanceOf(address _owner) external view returns (uint256);

    function transfer(address _to, uint256 _amount) external returns (bool);
}

contract Manager {
    address payable public creator;
    uint256 public creatorFee;
    address payable public protocolTreasury;
    uint256 public protocolFee;
    IMarket public market;

    bool public initialized;
    bool public managerRewardDistributed;
    mapping(address => bool) public claimed; // claimed[referral]
    uint256 public amountClaimed;
    uint256 public creatorReward;
    uint256 public protocolReward;

    event ManagerRewardClaimed(address _manager, uint256 _amount);

    event ProtocolRewardClaimed(address _protocolTreasury, uint256 _amount);

    event ReferralRewardClaimed(address _referral, uint256 _reward);

    constructor() {}

    function initialize(
        address payable _creator,
        uint256 _creatorFee,
        address payable _protocolTreasury,
        uint256 _protocolFee,
        address _market
    ) external {
        require(!initialized, "Already initialized.");

        creator = _creator;
        creatorFee = _creatorFee;
        protocolTreasury = _protocolTreasury;
        protocolFee = _protocolFee;
        market = IMarket(_market);

        initialized = true;
    }

    function distributeRewards() external {
        require(market.resultSubmissionPeriodStart() != 0, "Fees not received");
        require(!managerRewardDistributed, "Reward already claimed");

        managerRewardDistributed = true;

        uint256 totalFee = creatorFee + protocolFee;
        uint256 totalReward = market.managementReward();
        uint256 totalBets = market.nextTokenID();
        uint256 nonReferralShare = totalBets - market.totalAttributions();

        uint256 creatorMarketReward = (totalReward * creatorFee * nonReferralShare) /
            (totalBets * totalFee * 2);
        creatorMarketReward += (totalReward * creatorFee) / (totalFee * 2);
        creatorReward += creatorMarketReward;

        uint256 protocolMarketReward = (totalReward * protocolFee * nonReferralShare) /
            (totalBets * totalFee * 3);
        protocolMarketReward += (totalReward * protocolFee * 2) / (totalFee * 3);
        protocolReward += protocolMarketReward;

        amountClaimed += creatorMarketReward + protocolMarketReward;
    }

    function executeCreatorRewards() external {
        uint256 creatorRewardToSend = creatorReward;
        creatorReward = 0;
        requireSendXDAI(creator, creatorRewardToSend);

        emit ManagerRewardClaimed(creator, creatorRewardToSend);
    }

    function executeProtocolRewards() external {
        uint256 protocolRewardToSend = protocolReward;
        protocolReward = 0;
        requireSendXDAI(protocolTreasury, protocolRewardToSend);

        emit ProtocolRewardClaimed(protocolTreasury, protocolRewardToSend);
    }

    function claimReferralReward(address _referral) external {
        require(market.resultSubmissionPeriodStart() != 0, "Fees not received");
        require(!claimed[_referral], "Reward already claimed");

        uint256 totalFee = creatorFee + protocolFee;
        uint256 totalReward = market.managementReward();
        uint256 referralShare = market.attributionBalance(_referral);
        uint256 totalBets = market.nextTokenID();

        uint256 rewardFromCreator = (totalReward * creatorFee * referralShare) /
            (totalBets * totalFee * 2);
        uint256 rewardFromProtocol = (totalReward * protocolFee * referralShare) /
            (totalBets * totalFee * 3);

        claimed[_referral] = true;
        amountClaimed += rewardFromCreator + rewardFromProtocol;
        requireSendXDAI(payable(_referral), rewardFromCreator + rewardFromProtocol);

        emit ReferralRewardClaimed(_referral, rewardFromCreator + rewardFromProtocol);
    }

    function distributeSurplus() external {
        require(market.resultSubmissionPeriodStart() != 0, "Can't distribute surplus yet");
        uint256 remainingManagementReward = market.managementReward() - amountClaimed;
        uint256 surplus = address(this).balance -
            remainingManagementReward -
            creatorReward -
            protocolReward;
        creatorReward += surplus / 2;
        protocolReward += surplus / 2;
    }

    function distributeERC20(IERC20 _token) external {
        uint256 tokenBalance = _token.balanceOf(address(this));
        _token.transfer(creator, tokenBalance / 2);
        _token.transfer(protocolTreasury, tokenBalance / 2);
    }

    function requireSendXDAI(address payable _to, uint256 _value) internal {
        (bool success, ) = _to.call{value: _value}(new bytes(0));
        require(success, "Send XDAI failed");
    }

    receive() external payable {}
}
