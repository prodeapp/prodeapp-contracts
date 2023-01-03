// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./../IMarket.sol";

contract LiquidityPool {
    uint256 public constant DIVISOR = 10000;
    uint256 private constant UINT_MAX = type(uint256).max;

    bool public initialized;
    IMarket public market;
    address public creator;
    uint256 public creatorFee;
    uint256 public pointsToWin; // points that a user needs to win the liquidity pool prize
    uint256 public betMultiplier; // how much the LP adds to the market pool for each $ added to the market
    uint256 public totalDeposits;
    uint256 public poolReward;
    uint256 public creatorReward;

    mapping(address => uint256) private balances;
    mapping(uint256 => bool) private claims;

    event Staked(address indexed _user, uint256 _amount);
    event Withdrawn(address indexed _user, uint256 _amount);
    event LiquidityReward(address indexed _user, uint256 _reward);
    event BetReward(uint256 indexed _tokenID, uint256 _reward);
    event MarketPaymentSent(address indexed _market, uint256 _amount);
    event MarketPaymentReceived(address indexed _market, uint256 _amount);

    constructor() {}

    function initialize(
        address _creator,
        uint256 _creatorFee,
        uint256 _betMultiplier,
        address _market,
        uint256 _pointsToWin
    ) external {
        require(!initialized, "Already initialized.");
        require(_creatorFee < DIVISOR, "Creator fee too big");
        require(
            _pointsToWin > 0 && _pointsToWin <= IMarket(_market).numberOfQuestions(),
            "Invalid pointsToWin value"
        );

        creator = _creator;
        creatorFee = _creatorFee;
        betMultiplier = _betMultiplier;
        market = IMarket(_market);
        pointsToWin = _pointsToWin;

        initialized = true;
    }

    function deposit() external payable {
        require(block.timestamp <= market.closingTime(), "Deposits not allowed");

        balances[msg.sender] += msg.value;
        totalDeposits += msg.value;

        emit Staked(msg.sender, msg.value);
    }

    function withdraw() external {
        require(market.nextTokenID() == 0, "Withdraw not allowed");

        uint256 amount = balances[msg.sender];
        balances[msg.sender] = 0;
        totalDeposits -= amount;

        emit Withdrawn(msg.sender, amount);
    }

    function claimLiquidityRewards(address _account) external {
        require(market.resultSubmissionPeriodStart() != 0, "Withdraw not allowed");
        require(
            block.timestamp > market.resultSubmissionPeriodStart() + market.submissionTimeout(),
            "Submission period not over"
        );
        require(balances[_account] > 0, "Not enough balance");

        uint256 amount;

        if (market.ranking(0).points >= pointsToWin) {
            // there's at least one winner, withdraw fees + excess deposit
            uint256 maxPayment = mulCap(market.price(), market.nextTokenID());
            maxPayment = mulCap(maxPayment, betMultiplier);
            uint256 excessDeposit = totalDeposits < maxPayment ? 0 : (totalDeposits - maxPayment);

            amount = ((poolReward + excessDeposit) * balances[_account]) / totalDeposits;
        } else {
            // withdraw fees + deposits
            amount = ((poolReward + totalDeposits) * balances[_account]) / totalDeposits;
        }

        balances[_account] = 0;

        requireSendXDAI(payable(_account), amount);
        emit LiquidityReward(_account, amount);
    }

    /** @dev Sends a prize to the token holder if applicable.
     *  @param _rankIndex The ranking position of the bet which reward is being claimed.
     *  @param _firstSharedIndex If there are many tokens sharing the same score, this is the first ranking position of the batch.
     *  @param _lastSharedIndex If there are many tokens sharing the same score, this is the last ranking position of the batch.
     */
    function claimBettorRewards(
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
        uint256[] memory prizes = market.getPrizes();
        for (uint256 i = _firstSharedIndex; i < prizes.length && i <= _lastSharedIndex; i++) {
            cumWeigths += prizes[i];
        }

        uint256 maxPayment = mulCap(market.price(), market.nextTokenID());
        maxPayment = mulCap(maxPayment, betMultiplier);
        uint256 marketPayment = totalDeposits < maxPayment ? totalDeposits : maxPayment;

        uint256 reward = (marketPayment * cumWeigths) / (DIVISOR * sharedBetween);
        claims[_rankIndex] = true;
        payable(market.ownerOf(market.ranking(_rankIndex).tokenID)).transfer(reward);
        emit BetReward(market.ranking(_rankIndex).tokenID, reward);
    }

    function executeCreatorRewards() external {
        uint256 creatorRewardToSend;
        if (totalDeposits == 0) {
            // No liquidity was provided. Creator gets all the rewards
            creatorRewardToSend = creatorReward + poolReward;
            poolReward = 0;
        } else {
            creatorRewardToSend = creatorReward;
        }
        creatorReward = 0;
        requireSendXDAI(payable(creator), creatorRewardToSend);
    }

    function requireSendXDAI(address payable _to, uint256 _value) internal {
        (bool success, ) = _to.call{value: _value}(new bytes(0));
        require(success, "LiquidityPool: Send XDAI failed");
    }

    /**
     * @dev Multiplies two unsigned integers, returns 2^256 - 1 on overflow.
     */
    function mulCap(uint256 _a, uint256 _b) internal pure returns (uint256) {
        // Gas optimization: this is cheaper than requiring '_a' not being zero, but the
        // benefit is lost if '_b' is also tested.
        // See: https://github.com/OpenZeppelin/openzeppelin-solidity/pull/522
        if (_a == 0) return 0;

        unchecked {
            uint256 c = _a * _b;
            return c / _a == _b ? c : UINT_MAX;
        }
    }

    receive() external payable {
        (, , address manager, , ) = market.marketInfo();
        if (msg.sender == manager) {
            creatorReward = (msg.value * creatorFee) / DIVISOR;
            poolReward = msg.value - creatorReward;
        }
    }
}
