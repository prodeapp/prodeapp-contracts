// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "./../interfaces/IMarket.sol";
import "./../interfaces/IMarketFactory.sol";
import "./LiquidityPool.sol";

contract LiquidityFactory {
    using Clones for address;

    struct LiquidityParameters {
        address creator;
        uint256 creatorFee;
        uint256 betMultiplier;
        uint256 pointsToWin;
    }

    struct MarketParameters {
        string marketName;
        string marketSymbol;
        uint256 creatorFee;
        uint256 closingTime;
        uint256 price;
        uint256 minBond;
        IMarketFactory.RealitioQuestion[] questionsData;
        uint16[] prizeWeights;
    }

    LiquidityPool[] public pools;
    mapping(address => bool) public exists;
    IMarketFactory public immutable marketFactory;

    address public governor;
    address public liquidityPool;

    event NewLiquidityPool(address indexed pool, address indexed market);

    /**
     *  @dev Constructor.
     *  @param _marketFactory Address of the marketFactory contract used to create the new markets.
     *  @param _liquidityPool Address of the liquidity pool contract that is going to be used for each new deployment.
     *  @param _governor Address of the governor of this contract.
     */
    constructor(
        address _marketFactory,
        address _liquidityPool,
        address _governor
    ) {
        marketFactory = IMarketFactory(_marketFactory);
        liquidityPool = _liquidityPool;
        governor = _governor;
    }

    function changeGovernor(address _governor) external {
        require(msg.sender == governor, "Not authorized");
        governor = _governor;
    }

    function changeLiquidityPool(address _liquidityPool) external {
        require(msg.sender == governor, "Not authorized");
        liquidityPool = _liquidityPool;
    }

    function createMarketWithLiquidityPool(
        MarketParameters memory _marketParameters,
        LiquidityParameters memory _liquidityParameters
    ) external returns (address, address) {
        // Create new Liquidity Pool
        address newPool = address(liquidityPool.clone());
        exists[newPool] = true;
        pools.push(LiquidityPool(payable(newPool)));

        // Create new market
        address newMarket = marketFactory.createMarket(
            _marketParameters.marketName,
            _marketParameters.marketSymbol,
            newPool,
            _marketParameters.creatorFee,
            _marketParameters.closingTime,
            _marketParameters.price,
            _marketParameters.minBond,
            _marketParameters.questionsData,
            _marketParameters.prizeWeights
        );

        // Initialize Liquidity Pool
        LiquidityPool(payable(newPool)).initialize(
            _liquidityParameters.creator,
            _liquidityParameters.creatorFee,
            _liquidityParameters.betMultiplier,
            newMarket,
            _liquidityParameters.pointsToWin
        );

        emit NewLiquidityPool(newPool, newMarket);
        return (newMarket, newPool);
    }

    function getPools(uint256 _from, uint256 _to)
        external
        view
        returns (LiquidityPool[] memory poolsSlice)
    {
        if (_to == 0) {
            _to = pools.length;
        }

        uint256 total = _to - _from;
        poolsSlice = new LiquidityPool[](total);
        for (uint256 i = 0; i < total; i++) {
            poolsSlice[i] = pools[_from + i];
        }
        return poolsSlice;
    }

    function poolCount() external view returns (uint256) {
        return pools.length;
    }
}
