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
 * @title GnosisChainReceiverV2
 * @dev This contract receives transactions from the Connext BridgeFacet and places bets in the specified market on behalf of users.
 *
 * Payment Assumptions:
 * The xReceive() function expects at least an amount of DAI equal to the price of the bet, except when the user has a voucher assigned
 * and the market is whitelisted. In the latter scenario, DAI is not needed. Multiple bets are supported.
 *
 * If the amount received is not enough to cover the bet price, the transaction fails and the DAI remains in this contract. The owner of
 * this contract can withdraw the locked DAI.
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
 *     a router could at most steal the DAI bridged, which will likely be around 0-100 DAI, at the cost of losing the router's bond.
 *     Also notice that it isn't straight forward to steal the DAI. The router would need to create a fake Prode market or steal the bet
 *     instead of the money. In other words, this shouldn't be concerning.
 */
contract GnosisChainReceiverV2 is IXReceiver {
    struct SecretVoucher {
        uint256 voucherPrice;
        uint256 value;
    }

    /* Constants */

    /// @dev address of WXDAI token.
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

    /// @dev secret vouchers
    mapping(bytes32 => SecretVoucher) public secretVouchers;
    mapping(bytes32 => bool) claims;

    /// @dev New users that don't have xDAI are given a small amount.
    uint256 public faucetAmountPerNewUser = 0.0025 ether;

    event VoucherAmountChanged(address indexed _account, uint256 _newBalance);

    event VoucherUsed(address indexed _player, address indexed _market, uint256 indexed _tokenId);

    event FundingReceived(address indexed _from, address indexed _to, uint256 _amount);

    event VoucherTransfered(address indexed _from, address indexed _to, uint256 _amount);

    event WhitelistChanged(address indexed _market, bool whitelisted);

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

    function retrieveXDAI(address payable _to, uint256 _amount) external {
        require(msg.sender == owner || msg.sender == voucherController, "Not authorized");

        uint256 amount = _amount == 0 ? address(this).balance : _amount;
        (bool success, ) = _to.call{value: amount}(new bytes(0));
        require(success, "Send XDAI failed");
    }

    function withdrawWXDAI() external {
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
        IWXDAI(WXDAI).withdraw(_amount);

        address user;
        IMarket market;
        address attribution;
        uint8 elementSize;
        uint8 numberOfBets;
        assembly {
            // _callData layout:
            // length (32 bytes) + user (20 bytes) + market (20 bytes) + attribution (20 bytes) + elementSize (1 byte) + predictions
            user := mload(add(_callData, 20)) // First 12 bytes are dropped
            market := mload(add(_callData, 40)) // First 12 bytes are dropped
            attribution := mload(add(_callData, 60)) // First 12 bytes are dropped
            elementSize := mload(add(_callData, 61)) // First 31 bytes are dropped
            numberOfBets := mload(add(_callData, 62)) // First 31 bytes are dropped
        }

        KeyValue keyValue = KeyValue(IMarketFactoryV2(marketFactoryV2).keyValue());
        require(keyValue.marketCreator(address(market)) != address(0), "Market not authorized");
        require(elementSize > 0 && elementSize <= 32, "Invalid number of bytes");
        require(user != address(0), "Invalid user address");

        uint256 price = market.price();
        uint256 remainder = _amount;
        uint256 numberOfQuestions = market.numberOfQuestions();
        bytes32[] memory predictions = new bytes32[](numberOfQuestions);
        for (uint256 j = 0; j < numberOfBets; j++) {
            for (uint256 i = 0; i < numberOfQuestions; i++) {
                bytes32 prediction;
                uint256 offset = 297 + (j * numberOfQuestions + i) * elementSize;
                assembly {
                    prediction := calldataload(offset)
                }
                predictions[i] = prediction >> (8 * (32 - elementSize));
            }

            if (
                voucherBalance[user] >= price &&
                address(this).balance >= price &&
                marketsWhitelist[address(market)]
            ) {
                // Use voucher
                voucherBalance[user] -= price;
                voucherTotalSupply -= price;
                emit VoucherUsed(user, address(market), market.nextTokenID());
            } else {
                remainder -= price;
            }
            uint256 tokenId = market.placeBet{value: price}(attribution, predictions);
            market.transferFrom(address(this), user, tokenId);
        }

        if (remainder > 0) payable(user).send(remainder);

        if (user.balance == 0 && address(this).balance > faucetAmountPerNewUser)
            payable(user).send(faucetAmountPerNewUser);

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

    /** @dev Increases the balance of the voucher available for a specific list of addresses.
     *  The voucher controller can add unbacked vouchers. This could be useful for things like
     *  whitelisting N addresses while having a stock of M < N vouchers.
     *  @param _tos Address of the receiver.
     *  @param _amounts Amount to assign to each address.
     */
    function fundAddresses(address[] calldata _tos, uint256[] calldata _amounts) external payable {
        uint256 totalAmount;
        for (uint256 i = 0; i < _tos.length; i++) {
            totalAmount += _amounts[i];
            voucherBalance[_tos[i]] += _amounts[i];
            emit FundingReceived(msg.sender, _tos[i], _amounts[i]);
        }
        voucherTotalSupply += totalAmount;

        if (msg.sender != voucherController) {
            require(msg.value == totalAmount, "Not enough funds");
        }
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

    /** @dev The voucher controller can remove vouchers from any account. xDAI assigned to these
     *  vouchers is not withdrawn in this method and should be dealt with separately.
     *  @param _accounts Addresses of the vocher owners to remove.
     */
    function removeVouchers(address[] calldata _accounts) external {
        require(msg.sender == voucherController, "Not authorized");

        for (uint256 i = 0; i < _accounts.length; i++) {
            uint256 amount = voucherBalance[_accounts[i]];
            voucherBalance[_accounts[i]] = 0;
            voucherTotalSupply -= amount;
        }
    }

    /** @dev Allocates a secret bet voucher that can be later assigned to anyone holding the password.
     *  @param _key key of the voucher.
     *  @param _voucherPrice price of each voucher.
     */
    function addSecretVoucher(bytes32 _key, uint256 _voucherPrice) external payable {
        require(msg.value > 0 && msg.value >= _voucherPrice, "Not enough funds");
        require(secretVouchers[_key].value == 0, "Already funded");
        secretVouchers[_key] = SecretVoucher({voucherPrice: _voucherPrice, value: msg.value});
    }

    /** @dev Assigns a secret voucher to the caller of this function.
     *  @param _superSecretCode password to get a free voucher.
     */
    function claimSecretVoucher(string calldata _superSecretCode) external {
        bytes32 key = keccak256(abi.encodePacked(_superSecretCode));
        bytes32 claimKey = keccak256(abi.encodePacked(_superSecretCode, msg.sender));

        require(!claims[claimKey], "Already claimed");
        require(secretVouchers[key].value > 0, "Secret voucher not available");

        secretVouchers[key].value -= secretVouchers[key].voucherPrice;
        claims[claimKey] = true;

        voucherBalance[msg.sender] += secretVouchers[key].voucherPrice;
        voucherTotalSupply += secretVouchers[key].voucherPrice;
        emit FundingReceived(address(this), msg.sender, secretVouchers[key].voucherPrice);
    }

    /** @dev Allows the owner of the contract to remove a secret voucher if it was not already claimed.
     *  @param _keys keys of the vouchers.
     */
    function removeSecretVouchers(bytes32[] calldata _keys) external {
        require(msg.sender == voucherController, "Not authorized");

        uint256 totalValue;
        for (uint256 i = 0; i < _keys.length; i++) {
            bytes32 _key = _keys[i];
            require(secretVouchers[_key].value > 0, "Invalid code or already claimed");

            totalValue += secretVouchers[_key].value;
            secretVouchers[_key].value = 0;
            secretVouchers[_key].voucherPrice = 0;
        }

        (bool success, ) = payable(msg.sender).call{value: totalValue}(new bytes(0));
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
    ) external returns (uint256) {
        require(marketsWhitelist[_market] == true, "Market not whitelisted");

        uint256 price = IMarket(_market).price();
        voucherBalance[msg.sender] -= price;

        uint256 tokenId = IMarket(_market).placeBet{value: price}(_attribution, _results);
        IMarket(_market).transferFrom(address(this), msg.sender, tokenId);

        emit VoucherUsed(msg.sender, _market, tokenId);

        return tokenId;
    }

    /** @dev Places multiple bets using the voucher balance + msg.value and transfers the NFT to the sender.
     *  @param _market Address of the market.
     *  @param _attributions Addresses that sent the referral. If 0x0, it's ignored.
     *  @param _resultsArray Answer predictions to the questions asked in Realitio.
     *  @return the last minted token id.
     */
    function placeBets(
        address _market,
        address[] calldata _attributions,
        bytes32[][] calldata _resultsArray
    ) external payable returns (uint256) {
        require(marketsWhitelist[_market] == true, "Market not whitelisted");

        uint256 price = IMarket(_market).price() * _attributions.length;
        if (voucherBalance[msg.sender] >= price) {
            voucherBalance[msg.sender] -= price;
        } else {
            require(msg.value + voucherBalance[msg.sender] == price, "Wrong value sent");
            voucherBalance[msg.sender] = 0;
        }

        uint256 tokenId = IMarket(_market).nextTokenID();
        uint256 lastTokenId = IMarket(_market).placeBets{value: price}(
            _attributions,
            _resultsArray
        );

        for (; tokenId <= lastTokenId; tokenId++) {
            IMarket(_market).transferFrom(address(this), msg.sender, tokenId);
        }

        emit VoucherUsed(msg.sender, _market, lastTokenId);

        return lastTokenId;
    }

    /** @dev Adds a market to the whitelist.
     *  @param _market Address of the market.
     *  @param _whitelist True to whitelist _market.
     */
    function whitelistMarket(address _market, bool _whitelist) external {
        require(msg.sender == voucherController, "Not authorized");

        marketsWhitelist[_market] = _whitelist;

        emit WhitelistChanged(_market, _whitelist);
    }
}
