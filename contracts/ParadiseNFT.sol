// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "./extensions/ERC20Storage.sol";

contract ParadiseNFT is ERC1155URIStorage, ERC20Storage, Ownable {
    uint256 public constant ONE_TOKEN = 1;
    uint256 public constant TEN_TOKENS = 10;

    constructor(string memory baseURI_, address tokenAddress_)
        ERC1155("")
        ERC20Storage(tokenAddress_)
    {
        _setBaseURI(baseURI_);
    }

    // ------------------------------------------------------------------------

    function _checkTokenId(uint256 id) internal pure {
        require(
            id == ONE_TOKEN || id == TEN_TOKENS,
            "ParadiseNFT: Invalid token id"
        );
    }

    function _checkFunds(uint256 amount) internal view {
        require(
            _token.balanceOf(address(this)) >= amount,
            "ParadiseNFT: Not enough tokens to transfer"
        );
    }

    // ------------------------------------------------------------------------

    /**
     * Set token URI
     */
    function setURI(uint256 tokenId, string memory tokenURI) public onlyOwner {
        _setURI(tokenId, tokenURI);
    }

    /**
     * Set base URI
     */
    function setBaseURI(string memory baseURI) public onlyOwner {
        _setBaseURI(baseURI);
    }

    function uri(uint256 tokenId) public view override returns (string memory) {
        return super.uri(tokenId);
    }

    // ------------------------------------------------------------------------

    /**
     * Set token address
     */
    function setToken(address tokenAddress_) public onlyOwner {
        _setToken(tokenAddress_);
    }

    /**
     * Get token address
     */
    function token() public view onlyOwner returns (address) {
        return super._tokenAddress();
    }

    // ------------------------------------------------------------------------

    /**
     * Mint NFTs
     *
     * Requirements:
     *
     * - Check token id
     * - Check funds
     */
    function mint(
        address account,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) public onlyOwner {
        _checkTokenId(id);
        _checkFunds(id * amount);

        _mint(account, id, amount, data);
    }

    /**
     * Mint batch NFTs
     *
     * Requirements:
     *
     * - Check token id
     * - Check funds
     */
    function mintBatch(
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) public onlyOwner {
        uint256 totalAmount = 0;

        for (uint256 i = 0; i < ids.length; i++) {
            _checkTokenId(ids[i]);

            totalAmount += ids[i] * amounts[i];
        }

        _checkFunds(totalAmount);

        _mintBatch(to, ids, amounts, data);
    }

    // ------------------------------------------------------------------------

    /**
     * Burn NFTs
     */
    function burn(
        address account,
        uint256 id,
        uint256 amount
    ) public onlyOwner {
        _burn(account, id, amount);

        _token.transfer(address(0), id * amount);
    }

    /**
     * Burn batch NFTs
     */
    function burnBatch(
        address from,
        uint256[] memory ids,
        uint256[] memory amounts
    ) public onlyOwner {
        _burnBatch(from, ids, amounts);

        uint256 totalAmount = 0;

        for (uint256 i = 0; i < ids.length; i++) {
            totalAmount += ids[i] * amounts[i];
        }

        _token.transfer(address(0), totalAmount);
    }

    // ------------------------------------------------------------------------

    /**
     * Swap ERC20 tokens for NFTs
     *
     * Requirements:
     *
     * - Check token id
     */
    function swap(uint256 id, uint256 amount) public {
        _checkTokenId(id);

        _burn(_msgSender(), id, amount);

        _token.transfer(_msgSender(), id * amount);
    }

    /**
     * Swap batch ERC20 tokens for NFTs
     *
     * Requirements:
     *
     * - Check token id
     */
    function swapBatch(uint256[] memory ids, uint256[] memory amount) public {
        require(
            ids.length == amount.length,
            "ParadiseNFT: ids and amount arrays must be the same length"
        );

        uint256 totalAmount = 0;

        for (uint256 i = 0; i < ids.length; i++) {
            _checkTokenId(ids[i]);

            totalAmount += ids[i] * amount[i];
        }

        _burnBatch(_msgSender(), ids, amount);

        _token.transfer(_msgSender(), totalAmount);
    }
}
