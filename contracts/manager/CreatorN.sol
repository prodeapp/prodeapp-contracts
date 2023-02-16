// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./../interfaces/IMarket.sol";

interface IERC20 {
    function balanceOf(address _owner) external view returns (uint256);

    function transfer(address _to, uint256 _amount) external returns (bool);
}

contract CreatorN {
    IMarket public immutable market;
    uint256 public immutable N;

    constructor(IMarket _market, uint256 _N) {
        market = _market;
        N = _N;
    }

    function distribute() external {
        require(market.resultSubmissionPeriodStart() != 0, "Fees not received");
        uint256 totalBets = market.nextTokenID();
        uint256 numberOfBeneficiaries = N <= totalBets ? N : totalBets;
        uint256 amount = address(this).balance / numberOfBeneficiaries;

        for (uint256 tokenID = 0; tokenID < numberOfBeneficiaries; tokenID++) {
            payable(market.ownerOf(tokenID)).send(amount);
        }
    }

    function distributeERC20(IERC20 _token) external {
        require(market.resultSubmissionPeriodStart() != 0, "Fees not received");
        uint256 totalBets = market.nextTokenID();
        uint256 numberOfBeneficiaries = N <= totalBets ? N : totalBets;
        uint256 amount = _token.balanceOf(address(this)) / numberOfBeneficiaries;

        for (uint256 tokenID = 0; tokenID < numberOfBeneficiaries; tokenID++) {
            _token.transfer(market.ownerOf(tokenID), amount);
        }
    }

    receive() external payable {}
}
