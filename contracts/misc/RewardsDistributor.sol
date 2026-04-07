// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../interfaces/IMarket.sol";
import "../interfaces/IMarketFactory.sol";

interface ILiquidityFactory {
    function exists(address) external view returns (bool);
}

interface ILiquidityPool {
    function creator() external view returns (address);

    function creatorFee() external view returns (uint256);

    function pointsToWin() external view returns (uint256);

    function betMultiplier() external view returns (uint256);

    function totalDeposits() external view returns (uint256);

    function getMarketPaymentIfWon() external view returns (uint256);

    function claimLiquidityRewards(address _account) external;

    function executeCreatorRewards() external;

    function claimBettorRewards(
        uint256 _rankIndex,
        uint256 _firstSharedIndex,
        uint256 _lastSharedIndex
    ) external;
}

contract RewardsDistributor {
    struct WinnersData {
        uint256 points;
        uint256 rankIndex;
        uint256 firstSharedIndex;
        uint256 endSharedIndex;
    }

    mapping(address => bool) public distributedMarkets;

    event RewardsDistributed(address market);

    function getPendingMarkets(IMarketFactory marketFactory, uint256 count)
        external
        view
        returns (address[] memory)
    {
        IMarket[] memory allMarkets = marketFactory.allMarkets();
        uint256 length = allMarkets.length;

        address[] memory pendingMarkets = new address[](count);
        uint256 j = 0;

        for (uint256 i = 0; i < length; i++) {
            if (distributedMarkets[address(allMarkets[i])]) {
                continue;
            }

            if (address(allMarkets[i]).balance == 0) {
                continue;
            }

            IMarket market = IMarket(allMarkets[i]);

            uint256 resultSubmissionPeriodStart = market.resultSubmissionPeriodStart();

            if (resultSubmissionPeriodStart == 0) {
                continue;
            }

            if (block.timestamp > (resultSubmissionPeriodStart + market.submissionTimeout())) {
                pendingMarkets[j++] = address(allMarkets[i]);

                if (j == count) {
                    break;
                }
            }
        }

        return pendingMarkets;
    }

    function distributeRewards(
        IMarket market,
        ILiquidityFactory liquidityFactory,
        WinnersData[] memory winnersData,
        address[] memory stakers
    ) public {
        (, , address managerAddress, , ) = market.marketInfo();

        bool hasLiquidityPool = liquidityFactory.exists(managerAddress);

        for (uint256 i = 0; i < winnersData.length; i++) {
            try
                IMarket(market).claimRewards(
                    winnersData[i].rankIndex,
                    winnersData[i].firstSharedIndex,
                    winnersData[i].endSharedIndex
                )
            {} catch {
                // already claimed
            }
        }

        if (hasLiquidityPool && managerAddress.balance > 0) {
            ILiquidityPool liquidityPool = ILiquidityPool(managerAddress);
            for (uint256 j = 0; j < stakers.length; j++) {
                try liquidityPool.claimLiquidityRewards(stakers[j]) {} catch {
                    // already claimed
                }
            }

            try liquidityPool.executeCreatorRewards() {} catch {
                // already claimed
            }

            uint256 pointsToWin = liquidityPool.pointsToWin();
            for (uint256 j = 0; j < winnersData.length; j++) {
                if (winnersData[j].points >= pointsToWin) {
                    try
                        liquidityPool.claimBettorRewards(
                            winnersData[j].rankIndex,
                            winnersData[j].firstSharedIndex,
                            winnersData[j].endSharedIndex
                        )
                    {} catch {
                        // already claimed
                    }
                }
            }
        }

        if (winnersData.length == 0) {
            uint256 numberOfTokens = market.nextTokenID();
            for (uint256 i = 0; i < numberOfTokens; i++) {
                try market.reimbursePlayer(i) {} catch {
                    // player already reimbursed
                }
            }
        }

        distributedMarkets[address(market)] = true;

        emit RewardsDistributed(address(market));
    }
}
