// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../interfaces/IMarket.sol";
import "../interfaces/IUniswapV2Router.sol";
import "../misc/KeyValue.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/* Interfaces */

interface IMarketFactoryV2 {
    function keyValue() external view returns (address);
}

interface IVoucherManager {
    function placeBet(
        IMarket _market,
        address _attribution,
        bytes32[] calldata _results
    ) external payable returns (uint256);

    function fundAddress(address _to) external payable;

    function balance(address _owner) external view returns (uint256);
}

/**
 * @title GnosisChainReceiver
 * @dev This contract receives transactions from the Connext BridgeFacet and places bets in the specified market on behalf of users.
 *
 * Payment Assumptions:
 * The xReceive() function expects at least an amount of USDC equal to the price of the bet. However, the USDC-xDAI exchange rate is
 * not exactly 1:1. On the background, xReceive() swaps USDC for xDAI, expecting to receive at least 95% of it, and then uses the xDAI
 * to place the bet. If the xDAI obtained is greater than the bet price, the difference stays in this contract. If the xDAI obtained 
 * is smaller than the bet price but the contract was holding enough xDAI to cover the difference, the bet is placed anyway. If the amount
 * is not enough, the operation reverts and the USDC received stays in the contract. This should happen rarely and in this case the owner
 * of the contract can recover the USDC and reimburse the affected user.
 *
 * Bets placed through this contract are expected to be small (0-100 xDAI). The contract is expected to hold a small amount of xDAI to
 * potentially subsidize underfunded bets because of exchange rate volatility and slippage. This should help the user experience at a
 * very small cost and ~0 risk.
 *
 * User Account Assumptions:
 * The user specified in the xReceive() transaction must be an address that the user controls on Gnosis chain. If the user is bridging
 * his bet form another chain using a smart contract wallet which address cannot be replicated on Gnosis chain, then the user will lose
 * the bet NFT.
 *
 * Additional Features and Considerations:
 *  1. If a bridged bet wins a prize, the prize is not bridged back. The owner of the bet will receive the prize on Gnosis chain.
 *  2. In order to onboard users to Gnosis chain smoothly, users holding 0 xDAI will receive `faucetAmountPerNewUser` xDAI if available
 *     in the contract balance. This amount should be enough to make a few transactions.
 *  3. This contract supports bet vouchers. This means that users bridging bets don't need to pay if they received a voucher.
 *  4. This receiver contract utilizes Connext fast path. There is a risk of routers behaving maliciously. Nevertheless, for each bet
 *     a router could at most steal the USDC bridged which will likely be around 0-100 USDC at the cost of losing the router's bond.
 *     Also notice that it isn't straight forward to steal the USDC. The router would need to create a fake Prode market or steal the bet
 *     instead of the money. In other words, this shouldn't be concerning.
 */
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

    /// @dev address of Prode's market factory contract on Gnosis chain.
    address private constant marketFactoryV2 = 0x364Bc6fCdF1D2Ce014010aB4f479a892a8736014;

    /// @dev address of Prode's VoucherManager contract on Gnosis chain.
    IVoucherManager private constant voucherManager =
        IVoucherManager(0x10Df43e85261df385B2b865705738233626a21Ad);

    /* Storage */

    address public owner = msg.sender;

    address public voucherController = msg.sender;

    /// @dev voucherBalance[user] contains the amount of xDAI entitled to use from the voucherManager on the user bahalf.
    mapping(address => uint256) public voucherBalance;

    /// @dev total supply of xDAIs worth of betting vouchers. The contract actually holding the funds is the voucherManager.
    uint256 public voucherTotalSupply;

    /// @dev An array of token addresses. Any swap needs to have a starting and end path, path.length must be >= 2. Pools for each consecutive pair of addresses must exist and have liquidity.
    address[] public path = [USDC, WXDAI];

    /// @dev New users that don't have xDAI are given a small amount.
    uint256 public faucetAmountPerNewUser = 0.0025 ether;

    event VoucherAmountChanged(address indexed _account, uint256 _newBalance);

    constructor() {}

    receive() external payable {}

    function changeOwner(address _owner) external {
        require(msg.sender == owner, "Not authorized");
        owner = _owner;
    }

    function changeVoucherController(address _voucherController) external {
        require(msg.sender == owner, "Not authorized");
        voucherController = _voucherController;
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

        if (voucherBalance[user] >= price && voucherManager.balance(address(this)) >= price) {
            // Use voucher
            voucherBalance[user] -= price;
            uint256 tokenId = voucherManager.placeBet(market, attribution, predictions);
            market.transferFrom(address(this), user, tokenId);
        } else {
            // USDC uses 6 decimals instead of 18.
            require(_amount * 10**12 >= price, "Insufficient USDC received");

            swapUSDCtoXDAI();

            uint256 tokenId = market.placeBet{value: price}(attribution, predictions);
            market.transferFrom(address(this), user, tokenId);
        }

        if (user.balance == 0 && address(this).balance > faucetAmountPerNewUser)
            payable(user).send(faucetAmountPerNewUser);

        return "";
    }

    /** @dev Updates the balance of the vouchers available for a specific address.
     *  @param _account Address of the voucher receiver.
     *  @param _newBalance Address of the voucher receiver.
     */
    function registerVoucher(address _account, uint256 _newBalance) external {
        require(msg.sender == voucherController, "Not authorized");
        uint256 previousBalance = voucherBalance[_account];
        voucherBalance[_account] = _newBalance;
        voucherTotalSupply = voucherTotalSupply - previousBalance + _newBalance;

        require(voucherTotalSupply <= voucherManager.balance(address(this)));

        emit VoucherAmountChanged(_account, _newBalance);
    }

    /** @dev Updates the balance of the vouchers available for a specific address.
     *  @param _account Address of the voucher receiver.
     */
    function fundAndRegisterVoucher(address _account) external payable {
        voucherBalance[_account] += msg.value;
        voucherTotalSupply += msg.value;

        voucherManager.fundAddress{value: msg.value}(address(this));
        require(voucherTotalSupply <= voucherManager.balance(address(this)));

        emit VoucherAmountChanged(_account, voucherBalance[_account]);
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
