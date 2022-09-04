// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./IMarket.sol";

contract VoucherManager {

    address public owner = msg.sender;

    mapping(address => uint256) public balance;

    event VoucherUsed(
        address indexed _player,
        address indexed _market,
        uint256 indexed _tokenId
    );

    event FundingReceived(
        address indexed _from,
        address indexed _to,
        uint256 _amount
    );

    event VoucherTransfered(
        address indexed _from,
        address indexed _to,
        uint256 _amount
    );

    constructor() {}

    function changeOwner(address _owner) external {
        require(msg.sender == owner, "Not authorized");
        owner = _owner;
    }

    /** @dev Places a bet using the voucher balance and transfers the NFT to the sender.
     *  @param _market Address of the market.
     *  @param _attribution Address that sent the referral. If 0x0, it's ignored.
     *  @param _results Answer predictions to the questions asked in Realitio.
     *  @return the minted token id.
     */
    function placeBet(address _market, address _attribution, bytes32[] calldata _results)
        external
        payable
        returns (uint256)
    {
        uint256 price = IMarket(_market).price();

        require(balance[msg.sender] >= price, "Insufficient voucher balance");

        balance[msg.sender] -= price;

        uint256 tokenId = IMarket(_market).placeBet{value: price}(_attribution, _results);

        IMarket(_market).transferFrom(address(this), msg.sender, tokenId);

        emit VoucherUsed(msg.sender, _market, tokenId);

        return tokenId;
    }

    /** @dev Increases the balance of the vouchers available for a specific address.
     *  @param _to Address of the receiver.
     */
    function fundAddress(address _to) external payable {
        balance[_to] += msg.value;

        emit FundingReceived(msg.sender, _to, msg.value);
    }

    /** @dev Transfers balance from an address to another.
     *  @param _from Address of the current vocher owner.
     *  @param _to Address of the new voucher owner.
     *  @param _amount amount to transfer.
     */
    function transferVoucher(address _from, address _to, uint256 _amount) external {
        require(msg.sender == owner, "Not authorized");
        require(balance[_from] >= _amount, "Insufficient voucher balance");

        balance[_from] -= _amount;
        balance[_to] += _amount;

        emit VoucherTransfered(_from, _to, _amount);
    }

}