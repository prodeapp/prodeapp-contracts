// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/* Interfaces */

/**
 * @title UniswapV2Router Interface
 * @dev See https://uniswap.org/docs/v2/smart-contracts/router02/#swapexactethfortokens.
 * @dev See https://uniswap.org/docs/v2/smart-contracts/router02/#swapExactTokensForETH.
 */
interface IUniswapV2Router {
    function swapExactETHForTokens(
        uint256 amountOutMin, //minimum amount of output token that must be received
        address[] calldata path, //the different hops between tokens to be made by the exchange
        address to, //recipient
        uint256 deadline //unix timestamp after which the transaction will revert
    )
        external
        payable
        returns (
            uint256[] memory amounts //amounts of tokens output received
        );

    function swapExactTokensForETH(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    function getAmountsOut(
        uint256 amountIn, //amount of input token
        address[] memory path //the different hops between tokens to be made by the exchange
    )
        external
        view
        returns (
            uint256[] memory amounts //amounts of tokens output calculated to be received
        );
}
