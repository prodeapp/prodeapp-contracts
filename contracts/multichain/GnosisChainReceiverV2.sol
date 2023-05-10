// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../interfaces/IMarket.sol";
import "../misc/KeyValue.sol";
import "@connext/interfaces/core/IXReceiver.sol";

/* Interfaces */

interface IMarketFactoryV2 {
    function keyValue() external view returns (address);
}

interface IWXDAI {
    function withdraw(uint256 wad) external;

    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title GnosisChainReceiver
 * @dev This contract receives transactions from the Connext BridgeFacet and places bets in the specified market on behalf of users.
 *
 * Payment Assumptions:
 * The xReceive() function expects at least an amount of USDC equal to the price of the bet, except when the user has a voucher assigned
 * and the market is whitelisted. In the latter scenario, USDC is not needed.
 *
 * Prode markets only accept xDAI as payment. When USDC is used to bet, it must first be swapped for xDAI. the USDC-xDAI exchange rate is
 * not exactly 1:1. On the background, xReceive() swaps USDC for xDAI, expecting to receive at least 97.5% of it, and then uses the xDAI
 * to place the bet. If the xDAI obtained is greater than the bet price, the difference stays in this contract. If the xDAI obtained
 * is smaller than the bet price but the contract was holding enough xDAI to cover the difference, the bet is placed anyway. If the amount
 * is not enough, the operation reverts and the USDC received stays in the contract. This should happen rarely and in this case the owner
 * of the contract can recover the USDC and reimburse the affected user.
 *
 * Bets placed through this contract are expected to be small (0-100 xDAI). The contract is expected to hold a small amount of xDAI to
 * potentially subsidize underfunded bets because of exchange rate volatility and slippage. This should improve UX at a very small cost
 * and ~0 risk.
 *
 * User Account Assumptions:
 * The user specified in the xReceive() transaction must be an address that the user controls on Gnosis chain. If the user is bridging
 * his bet from another chain using a smart contract wallet which address cannot be replicated on Gnosis chain, then the user will lose
 * the bet NFT.
 *
 * Additional Features and Considerations:
 *  1. If a bridged bet wins a prize, the prize is not bridged back. The owner of the bet will receive the prize on Gnosis chain.
 *  2. In order to onboard users to Gnosis chain smoothly, users holding 0 xDAI will receive `faucetAmountPerNewUser` xDAI if available
 *     in the contract balance. This amount should be enough to make a few transactions.
 *  3. This contract supports bet vouchers. This means that users bridging bets don't need to pay if they received a voucher.
 *  4. This receiver contract utilizes Connext fast path. There is a risk of routers behaving maliciously. Nevertheless, for each bet
 *     a router could at most steal the USDC bridged, which will likely be around 0-100 USDC, at the cost of losing the router's bond.
 *     Also notice that it isn't straight forward to steal the USDC. The router would need to create a fake Prode market or steal the bet
 *     instead of the money. In other words, this shouldn't be concerning.
 */
contract GnosisChainReceiver is IXReceiver {
    /* Constants */

    /// @dev address of WXDAI token. In Uniswap v2 there are no more direct xDAI pairs, all xDAI must be converted to wxDAI first.
    address private constant WXDAI = 0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d;

    /// @dev address of Connext BridgeFacet contract on Gnosis chain.
    address private constant Connext = 0x5bB83e95f63217CDa6aE3D181BA580Ef377D2109;

    /// @dev address of Prode's market factory v2 contract on Gnosis chain.
    address private constant marketFactoryV2 = 0x364Bc6fCdF1D2Ce014010aB4f479a892a8736014;

    /* Storage */

    address public owner = msg.sender;

    address public voucherController = msg.sender;

    /// @dev voucherBalance[user] contains the amount of xDAI entitled to use from the voucherManager on the user bahalf.
    mapping(address => uint256) public voucherBalance;

    /// @dev total supply of xDAIs worth of betting vouchers. The contract actually holding the funds is the voucherManager.
    uint256 public voucherTotalSupply;

    mapping(address => bool) public marketsWhitelist;

    event VoucherAmountChanged(address indexed _account, uint256 _newBalance);

    event VoucherUsed(address indexed _player, address indexed _market, uint256 indexed _tokenId);

    event FundingReceived(address indexed _from, address indexed _to, uint256 _amount);

    event VoucherTransfered(address indexed _from, address indexed _to, uint256 _amount);

    event MarketWhitelisted(address indexed _market);

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

    function retrieveXDAI(address payable _to) external {
        require(msg.sender == owner, "Not authorized");
        (bool success, ) = _to.call{value: address(this).balance}(new bytes(0));
        require(success, "Send XDAI failed");
    }

    function withdrawWXDAI(address payable _to) external {
        require(msg.sender == owner, "Not authorized");
        uint256 WXDAIbalance = IWXDAI(WXDAI).balanceOf(address(this));
        IWXDAI(WXDAI).withdraw(WXDAIbalance);
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
        require(_asset == WXDAI, "Invalid token");
        if (_amount > 0) {
            IWXDAI(WXDAI).withdraw(_amount);
        }

        address user;
        IMarket market;
        address attribution;
        uint8 elementSize;
        assembly {
            // _callData layout:
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
        uint256 remainder;

        if (voucherBalance[user] >= price && marketsWhitelist[address(market)]) {
            // Use voucher
            voucherBalance[user] -= price;
            voucherTotalSupply -= price;
            remainder = _amount;
            emit VoucherUsed(user, address(market), market.nextTokenID());
        } else {
            require(_amount >= price, "Insufficient wxDAI received");
            remainder = _amount - price;
        }
        uint256 tokenId = market.placeBet{value: price}(attribution, predictions);
        market.transferFrom(address(this), user, tokenId);

        if (remainder > 0)
            payable(user).send(remainder);

        return "";
    }

    /** @dev Increases the balance of the vouchers available for a specific address.
     *  @param _to Address of the receiver.
     */
    function fundAddress(address _to) external payable {
        voucherBalance[_to] += msg.value;
        voucherTotalSupply += msg.value;
        emit FundingReceived(msg.sender, _to, msg.value);
    }

    /** @dev Transfers balance from an address to another.
     *  @param _from Address of the current vocher owner.
     *  @param _to Address of the new voucher owner.
     *  @param _amount amount to transfer.
     */
    function transferVoucher(
        address _from,
        address _to,
        uint256 _amount
    ) external {
        require(msg.sender == voucherController, "Not authorized");
        require(voucherBalance[_from] >= _amount, "Insufficient voucher balance");

        voucherBalance[_from] -= _amount;
        voucherBalance[_to] += _amount;

        emit VoucherTransfered(_from, _to, _amount);
    }

    /** @dev Transfers balance from an address to another.
     *  @param _from Address of the current vocher owner.
     */
    function removeVoucher(address _from) external {
        require(msg.sender == voucherController, "Not authorized");

        uint256 amount = voucherBalance[_from];
        voucherBalance[_from] = 0;
        voucherTotalSupply -= amount;

        (bool success, ) = voucherController.call{value: amount}(new bytes(0));
        require(success, "Send XDAI failed");
    }

    /** @dev Places a bet using the voucher balance and transfers the NFT to the sender.
     *  @param _market Address of the market.
     *  @param _attribution Address that sent the referral. If 0x0, it's ignored.
     *  @param _results Answer predictions to the questions asked in Realitio.
     *  @return the minted token id.
     */
    function placeBet(
        address _market,
        address _attribution,
        bytes32[] calldata _results
    ) external payable returns (uint256) {
        require(marketsWhitelist[_market] == true, "Market not whitelisted");

        uint256 price = IMarket(_market).price();

        require(voucherBalance[msg.sender] >= price, "Insufficient voucher balance");

        voucherBalance[msg.sender] -= price;

        uint256 tokenId = IMarket(_market).placeBet{value: price}(_attribution, _results);

        IMarket(_market).transferFrom(address(this), msg.sender, tokenId);

        emit VoucherUsed(msg.sender, _market, tokenId);

        return tokenId;
    }

    /** @dev Adds a market to the whitelist.
     *  @param _market Address of the market.
     */
    function whitelistMarket(address _market) external {
        require(msg.sender == voucherController, "Not authorized");

        marketsWhitelist[_market] = true;

        emit MarketWhitelisted(_market);
    }
}
