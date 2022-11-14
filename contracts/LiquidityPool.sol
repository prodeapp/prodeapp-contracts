// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./IMarket.sol";

contract LiquidityPool {

    uint256 public constant DIVISOR = 10000;

    IMarket public market;
    uint256 public depositLimit;
    uint256 public pointsToWin; // points that a user needs to win the liquidity pool prize
    uint256 public marketPrizeShare; // share of the market prize that the LP wins if there is no winner
    uint256 public betMultiplier; // how much the LP adds to the market pool for each $ added to the market
    uint256 public totalDeposits;

    mapping(address => uint256) private _balances;

    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event MarketPaymentSent(address indexed market, uint256 amount);
    event MarketPaymentReceived(address indexed market, uint256 _amount);

    constructor(address _market, uint256 _depositLimit, uint256 _pointsToWin, uint256 _marketPrizeShare, uint256 _betMultiplier) {
        require(_pointsToWin > 0 && _pointsToWin <= IMarket(_market).numberOfQuestions(), "Invalid pointsToWin value");
        require(_marketPrizeShare < DIVISOR, "Market prize share too big");

        market = IMarket(_market);
        depositLimit = _depositLimit;
        pointsToWin = _pointsToWin;
        marketPrizeShare = _marketPrizeShare;
        betMultiplier = _betMultiplier;
    }

    function deposit() external payable {
        require(address(this).balance <= depositLimit, "Deposit limit reached");
        require(block.timestamp <= market.closingTime(), "Deposits not allowed");

        _balances[msg.sender] += msg.value;
        totalDeposits += msg.value;

        emit Staked(msg.sender, msg.value);
    }

    function withdraw() external {
        require(market.resultSubmissionPeriodStart() != 0, "Withdraw not allowed");
        require(_balances[msg.sender] > 0, "Not enough balance");

        uint256 amount = address(this).balance * _balances[msg.sender] / totalDeposits;
        _balances[msg.sender] = 0;

        requireSendXDAI(payable(msg.sender), amount);
        emit Withdrawn(msg.sender, amount);
    }

    function hasWinners() external view returns (bool) {
        require(market.resultSubmissionPeriodStart() != 0, "Results not available");
        return market.ranking(0).points >= pointsToWin;
    }

    function payToMarket() external {
        require(msg.sender == address(market), "Only market");

        uint256 maxPayment = market.price() * betMultiplier * market.nextTokenID();
        uint256 balance = address(this).balance;
        uint256 value = balance < maxPayment ? balance : maxPayment;

        market.receiveLiquidityPoolPayment{value: value}();
        emit MarketPaymentSent(address(market), value);
    }

    function receiveMarketPayment() external payable {
        require(msg.sender == address(market), "Only market");
        emit MarketPaymentReceived(address(market), msg.value);
    }

    function requireSendXDAI(address payable _to, uint256 _value) internal {
        (bool success, ) = _to.call{value: _value}(new bytes(0));
        require(success, "LiquidityPool: Send XDAI failed");
    }
}