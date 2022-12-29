// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./IMarket.sol";

contract LiquidityPool {

    uint256 public constant DIVISOR = 10000;

    IMarket public market;
    address public creator;
    uint256 public creatorFee;
    uint256 public pointsToWin; // points that a user needs to win the liquidity pool prize
    uint256 public betMultiplier; // how much the LP adds to the market pool for each $ added to the market
    uint256 public totalDeposits;
    uint256 public poolReward;

    mapping(address => uint256) private balances;
    mapping(uint256 => bool) private claims;

    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event BetReward(uint256 indexed _tokenID, uint256 _reward);
    event MarketPaymentSent(address indexed market, uint256 amount);
    event MarketPaymentReceived(address indexed market, uint256 _amount);

    constructor(address _creator, uint256 _creatorFee, uint256 _betMultiplier) {
        require(_creatorFee < DIVISOR, "Creator fee too big");

        creator = _creator;
        creatorFee = _creatorFee;
        betMultiplier = _betMultiplier;
    }

    // TODO: refactor
    function setMarket(address _market, uint256 _pointsToWin) external {
        require(_pointsToWin > 0 && _pointsToWin <= IMarket(_market).numberOfQuestions(), "Invalid pointsToWin value");

        market = IMarket(_market);
        pointsToWin = _pointsToWin;
    }

    function deposit() external payable {
        require(block.timestamp <= market.closingTime(), "Deposits not allowed");

        balances[msg.sender] += msg.value;
        totalDeposits += msg.value;

        emit Staked(msg.sender, msg.value);
    }

    function withdraw() external {
        require(market.resultSubmissionPeriodStart() != 0, "Withdraw not allowed");
        require(balances[msg.sender] > 0, "Not enough balance");

        uint256 amount;

        if (market.ranking(0).points >= pointsToWin) {
            // there's at least one winner, withdraw fees + excess deposit
            uint256 maxPayment = market.price() * betMultiplier * market.nextTokenID();
            uint256 excessDeposit = totalDeposits < maxPayment ? 0 : (totalDeposits - maxPayment);

            amount = (poolReward + excessDeposit) * balances[msg.sender] / totalDeposits;
        } else {
            // withdraw fees + deposits
            amount = address(this).balance * balances[msg.sender] / totalDeposits;
        }

        balances[msg.sender] = 0;

        requireSendXDAI(payable(msg.sender), amount);
        emit Withdrawn(msg.sender, amount);
    }

    /** @dev Sends a prize to the token holder if applicable.
     *  @param _rankIndex The ranking position of the bet which reward is being claimed.
     *  @param _firstSharedIndex If there are many tokens sharing the same score, this is the first ranking position of the batch.
     *  @param _lastSharedIndex If there are many tokens sharing the same score, this is the last ranking position of the batch.
     */
    function claimRewards(
        uint256 _rankIndex,
        uint256 _firstSharedIndex,
        uint256 _lastSharedIndex
    ) external {
        require(market.resultSubmissionPeriodStart() != 0, "Not in claim period");
        require(
            block.timestamp > market.resultSubmissionPeriodStart() + market.submissionTimeout(),
            "Submission period not over"
        );

        require(market.ranking(_rankIndex).points >= pointsToWin, "Invalid rankIndex");
        require(!claims[_rankIndex], "Already claimed");

        uint248 points = market.ranking(_rankIndex).points;
        // Check that shared indexes are valid.
        require(points == market.ranking(_firstSharedIndex).points, "Wrong start index");
        require(points == market.ranking(_lastSharedIndex).points, "Wrong end index");
        require(points > market.ranking(_lastSharedIndex + 1).points, "Wrong end index");
        require(
            _firstSharedIndex == 0 || points < market.ranking(_firstSharedIndex - 1).points,
            "Wrong start index"
        );
        uint256 sharedBetween = _lastSharedIndex - _firstSharedIndex + 1;

        uint256 cumWeigths = 0;
        for (uint256 i = _firstSharedIndex; i < market.getPrizes().length && i <= _lastSharedIndex; i++) {
            cumWeigths += market.prizeWeights(i);
        }

        uint256 maxPayment = market.price() * betMultiplier * market.nextTokenID();
        uint256 marketPayment = totalDeposits < maxPayment ? totalDeposits : maxPayment;

        uint256 reward = (marketPayment * cumWeigths) / (DIVISOR * sharedBetween);
        claims[_rankIndex] = true;
        payable(market.ownerOf(market.ranking(_rankIndex).tokenID)).transfer(reward);
        emit BetReward(market.ranking(_rankIndex).tokenID, reward);
    }

    function requireSendXDAI(address payable _to, uint256 _value) internal {
        (bool success, ) = _to.call{value: _value}(new bytes(0));
        require(success, "LiquidityPool: Send XDAI failed");
    }

    receive() external payable {
        ( , , address manager, , ) = market.marketInfo();
        if (msg.sender == manager) {
            uint256 creatorReward = msg.value * creatorFee / DIVISOR;
            requireSendXDAI(payable(creator), creatorReward);
            poolReward = msg.value - creatorReward;
        }
    }
}