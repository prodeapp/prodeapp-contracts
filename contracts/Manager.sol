// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./IMarket.sol";

contract Manager {
    address payable public creator;
    uint256 public creatorFee;
    address payable public protocolTreasury;
    uint256 public protocolFee;
    IMarket public market;

    bool public initialized;
	bool managerRewardDistributed;
    mapping(address => bool) public claimed; // claimed[referral]
	uint256 amountClaimed;

    constructor() { }

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

		uint256 creatorReward = totalReward * creatorFee * nonReferralShare / ( totalBets * totalFee * 2 );
		creatorReward += totalReward * creatorFee / ( totalFee * 2 );
		creator.send(creatorReward);

		uint256 protocolReward = totalReward * protocolFee * nonReferralShare / ( totalBets * totalFee * 3 );
		protocolReward += totalReward * protocolFee * 2 / ( totalFee * 3 );
		protocolTreasury.send(protocolReward);

		amountClaimed += creatorReward + protocolReward;
	}

	function claimReferralReward(address _referral) external {
		require(market.resultSubmissionPeriodStart() != 0, "Fees not received");
		require(!claimed[_referral], "Reward already claimed");

		uint256 totalFee = creatorFee + protocolFee;
		uint256 totalReward = market.managementReward();
		uint256 referralShare = market.attributionBalance(_referral);
		uint256 totalBets = market.nextTokenID();

		uint256 rewardFromCreator = totalReward * creatorFee * referralShare / ( totalBets * totalFee * 2 );
		uint256 rewardFromProtocol = totalReward * protocolFee * referralShare / ( totalBets * totalFee * 3 );

		claimed[_referral] = true;
		amountClaimed += rewardFromCreator + rewardFromProtocol;
		payable(_referral).send(rewardFromCreator + rewardFromProtocol);
	}

    function distributeRoyalties() external {
		require(market.resultSubmissionPeriodStart() != 0, "Royalties not received");
		uint256 remainingManagementReward = market.managementReward() - amountClaimed;
        uint256 royalties = address(this).balance - remainingManagementReward;
        creator.send(royalties / 2);
        protocolTreasury.send(royalties / 2);
    }

    receive() external payable {}
}
