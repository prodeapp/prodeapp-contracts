// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/* Interfaces */

/**
 * @title UniswapV2Router Interface
 * @dev See https://uniswap.org/docs/v2/smart-contracts/router02/#swapexactethfortokens. This will allow us to import swapExactETHForTokens function into our contract and the getAmountsOut function to calculate the token amount we will swap
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

/**
 * @title UBI Interface
 * @dev See https://github.com/DemocracyEarth/ubi/blob/master/contracts/UBI.sol This will allow us to see the UBI balance of our contract (burned UBI)
 */
interface IERC20 {
    function balanceOf(address _owner) external view returns (uint256);
}

/**
 * @title ERC677 Interface
 */
interface IERC677 {
    function transferAndCall(address receiver, uint amount, bytes memory data) external returns(bool success);
}

contract GnosisUBIBurner {

    /* Events */

    event BurnerAdded(address burner);
    event BurnerRemoved(address burner);
    event Received(address indexed from, uint256 amount);
    event BurnUBIRequested(address requester, uint256 UBIAmount);
    event Burned(address requester, address burner, uint256 amount, uint256 burned);

    /* Constants */

    /// @dev address of the uniswap v2 router (honeyswap)
    address private constant UNISWAP_V2_ROUTER = 0x1C232F01118CB8B424793ae03F870aa7D0ac7f77;

    /// @dev address of WXDAI token. In Uniswap v2 there are no more direct ETH pairs, all ETH must be converted to WETH first.
    address private constant WXDAI = 0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d;

    /// @dev address of WETH token on Gnosis chain.
    address private constant WETH = 0x6A023CCd1ff6F2045C3309768eAd9E68F978f6e1;

    /// @dev address of UBIBurner contract on mainnet.
    address private constant ForeignUBIBurner = 0x481B24Ed5feAcB37e282729b9815e27529Cf9ae2;

    /// @dev address of the omnibridge contract on the Gnosis chain.
    address private constant Omnibridge = 0xf6A78083ca3e2a662D6dd1703c939c8aCE2e268d;

    /* Storage */

    /// @dev An array of token addresses. Any swap needs to have a starting and end path, path.length must be >= 2. Pools for each consecutive pair of addresses must exist and have liquidity.
    address[] path = [WXDAI, WETH];

    /// @dev Parameter stored by the burner request of how much the minimum amount of UBIs burned should be.
    uint256 public currentAmountOutMin;

    /// @dev Burn requester. Variable stored because the burner cannot be the requester.
    address public currentBurnRequester;

    /* @dev Indicates if the address belongs to a burner. isBurner[address].
     * Burners are addresses with privilege access to the contracts functions.
     * They decide when and how xDAI is swapped for WETH and when WETH is relayed 
     * to mainnet's UBI burner. If malicious, compromised or negligent, 2 or more
     * burners could exploit the swap machanism or grief by relaying small WETH
     * amounts valued less than the gas required to claim the ETH on mainnet.
    */
    mapping(address => bool) public isBurner;

    /// @dev Indicates whether or not there is a request to add a new burner. requestBurnerAddMap[requesterAddress][burnerAddressToAdd].
    mapping(address => mapping(address => bool)) public requestBurnerAddMap;

    /// @dev Indicates whether or not there is a request to remove a burner. requestBurnerRemovalMap[requesterAddress][burnerAddressToRemove].
    mapping(address => mapping(address => bool)) public requestBurnerRemovalMap;

    /* Modifiers */

    modifier onlyBurner() {
        require(isBurner[msg.sender], "Not burner");
        _;
    }

    /* Constructor */

    /// @dev Burners will be created in the constructor
    constructor(address[] memory _burners) {
        addBurner(msg.sender); //_burner1
        for (uint256 i = 0; i < _burners.length; i++) {
            addBurner(_burners[i]);
        }
    }

    /* External and Public */

    // ************************ //
    // *       Requests       * //
    // ************************ //
    
    /** @dev Requests the creation of a new burner.
     *  @param _burnerToAdd Address of the burner requested to be added.
     */
    function requestBurnerAdd(address _burnerToAdd) external onlyBurner {
        requestBurnerAddMap[msg.sender][_burnerToAdd] = true;
    }

    /** @dev Acceptance of the new burner. Only a burner other than the requester can accept the request.
     *  @param _requester Requester address.
     *  @param _burnerToAdd Address of the burner to be accepted.
     */
    function AddBurnerAccepted(address _requester, address _burnerToAdd)
        external
        onlyBurner
    {
        require(
            !requestBurnerAddMap[msg.sender][_burnerToAdd] &&
                requestBurnerAddMap[_requester][_burnerToAdd]
        );
        requestBurnerAddMap[_requester][_burnerToAdd] = false;
        addBurner(_burnerToAdd);
    }

    /** @dev Requests the removal of a burner.
     *  @param _burnerToRemove Address of the burner requested to be removed.
     */
    function requestBurnerRemoval(address _burnerToRemove) external onlyBurner {
        requestBurnerRemovalMap[msg.sender][_burnerToRemove] = true;
    }

    /** @dev Acceptance of the burner to be removed. Only a burner other than the requester can accept the request.
     *  @param _requester Requester address.
     *  @param _burnerToRemove Address of the burner to be removed.
     */
    function deleteBurnerAccepted(address _requester, address _burnerToRemove)
        external
        onlyBurner
    {
        require(
            !requestBurnerRemovalMap[msg.sender][_burnerToRemove] &&
                requestBurnerRemovalMap[_requester][_burnerToRemove]
        );
        requestBurnerRemovalMap[_requester][_burnerToRemove] = false;
        isBurner[_burnerToRemove] = false;
    }

    /// @dev xDAI-WETH swap request. This stores the parameters to be used when another burner accepts. It can be called again to update the values.
    function requestSwap() external onlyBurner {
        currentAmountOutMin = getAmountOutMin();
        currentBurnRequester = msg.sender;
        emit BurnUBIRequested(msg.sender, currentAmountOutMin);
    }

    // ************************ //
    // *    Swap and Bridge   * //
    // ************************ //

    /** @dev Using the parameters stored by the requester, this function buys WETH with the xDAI contract balance and freezes on this contract.
     *  @param _deadline Unix timestamp after which the transaction will revert.
     */
    function getWETH(uint256 _deadline) external onlyBurner {
        uint256 _balanceToBurn = address(this).balance;
        uint256 _amountOutMin = currentAmountOutMin;
        // 0.1% less to avoid tx failure due to price decrease between request and approval
        uint256 _amountOutMinToUse = _amountOutMin - (_amountOutMin / 1000);
        address _burnRequester = currentBurnRequester;
        require(_burnRequester != msg.sender && _burnRequester != address(0));
        currentAmountOutMin = 0;
        currentBurnRequester = address(0);
        uint256[] memory amounts = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactETHForTokens{
            value: _balanceToBurn
        }(_amountOutMinToUse, path, address(this), _deadline);
        emit Burned(_burnRequester, msg.sender, _balanceToBurn, amounts[1]);
    }

    /** @dev Sends the WETH balance of this contract to the UBI burner on mainnet. WETH is converted to ETH in the process.
     *  @param _amount amount of WETH to send to mainnet. 
     *  Prevents small transfers that would cost relatively too much to claim on mainnet.
     *  Prevents big donations to be transferred at once and that would generate big price spikes.
     */
    function bridgeToMainnet(uint256 _amount) external onlyBurner {
        require(_amount <= IERC20(WETH).balanceOf(address(this)), "Not enough WETH");
        bytes memory recipientData = abi.encodePacked(
            0xa6439Ca0FCbA1d0F80df0bE6A17220feD9c9038a, // WETH OmniBridge helper contract on mainnet
            ForeignUBIBurner // UBIBurner address on mainnet
        );
        bool success = IERC677(WETH).transferAndCall(Omnibridge, _amount, recipientData);
        require(success, "Token bridging failed");
    }

    /* Internal */

    /** @dev Internal function to create a burner and emit an event.
     *  @param _burner Burner to add.
     */
    function addBurner(address _burner) internal {
        isBurner[_burner] = true;
        emit BurnerAdded(_burner);
    }

    /** @dev Internal function to remove a burner and emit an event.
     *  @param _burner Burner to delete.
     */
    function removeBurner(address _burner) internal {
        isBurner[_burner] = false;
        emit BurnerRemoved(_burner);
    }

    // ************************ //
    // *       Getters        * //
    // ************************ //

    /** @dev Calculate the minimum UBI amount from swapping the ETH contract balance.
     *  @return The minimum amount of output token that must be received.
     */
    function getAmountOutMin() public view returns (uint256) {
        if (address(this).balance == 0) return 0;
        uint256[] memory amountOutMins = IUniswapV2Router(UNISWAP_V2_ROUTER)
            .getAmountsOut(address(this).balance, path);
        return amountOutMins[1];
    }

    /* Fallback Function */

    /// @dev Allows the contract to receive ETH
    receive() external payable {
        emit Received(msg.sender, msg.value);
    }
}