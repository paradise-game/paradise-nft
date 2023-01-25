// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "../token/ERC20/IERC20.sol";

contract ERC20Storage {
    IERC20 internal _token;

    constructor(address tokenAddress_) {
        _token = IERC20(tokenAddress_);
    }

    /**
     * Set token address
     */
    function _setToken(address tokenAddress) internal {
        _token = IERC20(tokenAddress);
    }

    function _tokenAddress() internal view returns (address) {
        return address(_token);
    }
}
