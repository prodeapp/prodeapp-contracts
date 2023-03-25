// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../interfaces/IMarket.sol";
import "../misc/KeyValue.sol";

/* Interfaces */

/**
 * @title UniswapV2Router Interface
 * @dev See https://uniswap.org/docs/v2/smart-contracts/router02/#swapExactTokensForETH. This will allow us to import swapExactETHForTokens function into our contract and the getAmountsOut function to calculate the token amount we will swap
 */
interface IUniswapV2Router {
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

interface IMarketFactoryV2 {
    function keyValue() external view returns (address);
}

interface IERC20 {
    function balanceOf(address _owner) external view returns (uint256);

    function transfer(address to, uint256 amount) external returns (bool);

    function approve(address spender, uint256 amount) external returns (bool);
}

contract GnosisChainReceiver {
    /* Constants */

    /// @dev address of the uniswap v2 router (honeyswap)
    IUniswapV2Router private constant UNISWAP_V2_ROUTER =
        IUniswapV2Router(0x1C232F01118CB8B424793ae03F870aa7D0ac7f77);

    /// @dev address of WXDAI token. In Uniswap v2 there are no more direct xDAI pairs, all xDAI must be converted to wxDAI first.
    address private constant WXDAI = 0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d;

    /// @dev address of USDC token on Gnosis chain.
    address private constant USDC = 0xDDAfbb505ad214D7b80b1f830fcCc89B60fb7A83;

    /// @dev address of Connext BridgeFacet contract on Gnosis chain.
    address private constant Connext = 0x5bB83e95f63217CDa6aE3D181BA580Ef377D2109;

    address private constant marketFactoryV2 = 0x364Bc6fCdF1D2Ce014010aB4f479a892a8736014;

    /* Storage */

    address public owner = msg.sender;

    /// @dev An array of token addresses. Any swap needs to have a starting and end path, path.length must be >= 2. Pools for each consecutive pair of addresses must exist and have liquidity.
    address[] public path = [USDC, WXDAI];

    /// @dev New users that don't have xDAI are given a small amount.
    uint256 public faucetAmountPerNewUser = 0.0025 ether;

    constructor() {}

    receive() external payable {}

    function changeOwner(address _owner) external {
        require(msg.sender == owner, "Not authorized");
        owner = _owner;
    }

    function changeFaucetAmountPerNewUser(uint256 _amount) external {
        require(msg.sender == owner, "Not authorized");
        faucetAmountPerNewUser = _amount;
    }

    function forceSwap() external {
        require(msg.sender == owner, "Not authorized");
        swapUSDCtoXDAI();
    }

    function retrieveXDAI(address payable _to) external {
        require(msg.sender == owner, "Not authorized");
        (bool success, ) = _to.call{value: address(this).balance}(new bytes(0));
        require(success, "Send XDAI failed");
    }

    function retrieveUSDC(address payable _to) external {
        require(msg.sender == owner, "Not authorized");
        uint256 USDCbalance = IERC20(USDC).balanceOf(address(this));
        IERC20(USDC).transfer(_to, USDCbalance);
    }

    function xReceive(
        bytes32 _transferId,
        uint256 _amount,
        address _asset,
        address _originSender,
        uint32 _origin,
        bytes memory _callData
    ) external returns (bytes memory) {
        require(msg.sender == Connext, "Not authorized");
        require(_asset == USDC, "Invalid token");

        address user;
        IMarket market;
        address attribution;
        uint8 elementSize;
        assembly {
            // calldata layout:
            // length (32 bytes) + user (20 bytes) + market (20 bytes) + attribution (20 bytes) + elementSize (1 byte) + predictions
            user := mload(add(_callData, 20)) // First 12 bytes are dropped
            market := mload(add(_callData, 40)) // First 12 bytes are dropped
            attribution := mload(add(_callData, 60)) // First 12 bytes are dropped
            elementSize := mload(add(_callData, 61)) // First 31 bytes are dropped
        }

        KeyValue keyValue = KeyValue(IMarketFactoryV2(marketFactoryV2).keyValue());
        require(keyValue.marketCreator(address(market)) != address(0), "Market not authorized");
        require(elementSize > 0 && elementSize <= 32, "Invalid number of bytes");
        require(user != address(0), "Invalid user address");

        uint256 numberOfQuestions = market.numberOfQuestions();
        bytes32[] memory predictions = new bytes32[](numberOfQuestions);
        for (uint256 i = 0; i < numberOfQuestions; i++) {
            bytes32 prediction;
            uint256 offset = 289 + i * elementSize;
            assembly {
                prediction := calldataload(offset)
            }
            predictions[i] = prediction >> (8 * (32 - elementSize));
        }

        uint256 price = market.price();
        // USDC uses 6 decimals instead of 18.
        require(_amount * 10**12 >= price, "Insufficient USDC received");

        swapUSDCtoXDAI();

        uint256 tokenId = market.placeBet{value: price}(attribution, predictions);
        market.transferFrom(address(this), user, tokenId);
        if (user.balance == 0 && address(this).balance > faucetAmountPerNewUser)
            payable(user).send(faucetAmountPerNewUser);

        return "";
    }

    /** @dev Using the parameters stored by the requester, this function buys WETH with the xDAI contract balance and freezes on this contract.
     */
    function swapUSDCtoXDAI() internal {
        uint256 USDCbalance = IERC20(USDC).balanceOf(address(this));
        uint256[] memory amountOutMins = UNISWAP_V2_ROUTER.getAmountsOut(USDCbalance, path);
        // USDC uses 6 decimals instead of 18.
        require(
            amountOutMins[1] > (USDCbalance * 10**12 * 95) / 100,
            "Swap rate below depeg tolerance"
        );
        IERC20(USDC).approve(address(UNISWAP_V2_ROUTER), USDCbalance);
        UNISWAP_V2_ROUTER.swapExactTokensForETH(
            USDCbalance,
            amountOutMins[1],
            path,
            address(this),
            block.timestamp
        );
    }
}
