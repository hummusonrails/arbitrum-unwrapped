// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

/**
 * Arbitrum Unwrapped 2025 ERC721
 */
contract ArbitrumUnwrapped2025 is ERC721 {
    using Strings for uint256;

    event StoryMinted(address indexed minter, uint256 indexed tokenId, string storyText);

    // Mint price: ~$0.02 in ETH (creator fee)
    uint256 public constant MINT_PRICE = 0.000006 ether;

    // Address receiving creator fees.
    address public immutable creator;

    // Tracks total minted supply.
    uint256 public tokenSupply;

    // Stores the onchain story per token id.
    mapping(uint256 => string) private _storyById;

    constructor(address _creator) ERC721("Arbitrum Unwrapped 2025", "UNWRAPPED") {
        require(_creator != address(0), "Invalid creator");
        creator = _creator;
    }

    /**
     * Mint a new Arbitrum Unwrapped story NFT.
     */
    function mint(string calldata storyText) external payable returns (uint256 tokenId) {
        require(msg.value >= MINT_PRICE, "Mint price not met");
        require(bytes(storyText).length > 0, "Story required");

        tokenId = ++tokenSupply;
        _safeMint(msg.sender, tokenId);
        _storyById[tokenId] = storyText;

        emit StoryMinted(msg.sender, tokenId, storyText);

        // Forward the creator tip.
        (bool sent, ) = creator.call{value: msg.value}("");
        require(sent, "Tip transfer failed");
    }

    /// Next token id to be minted (supply + 1).
    function getNextTokenId() external view returns (uint256) {
        return tokenSupply + 1;
    }

    /// Override tokenURI to return lightweight JSON metadata.
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "ERC721: invalid token");

        string memory storyText = _storyById[tokenId];
        string memory image = "https://iili.io/fAPdWgV.md.png";
        string memory json = Base64.encode(
            bytes(
                string.concat(
                    '{"name":"Arbitrum Unwrapped 2025 #',
                    tokenId.toString(),
                    '","description":"Arbitrum Unwrapped 2025: your onchain year in one mint. ',
                    storyText,
                    '","image":"',
                    image,
                    '","attributes":[{"trait_type":"Story","value":"',
                    storyText,
                    '"}]}'
                )
            )
        );

        return string.concat("data:application/json;base64,", json);
    }

    /// Reads the stored story for a token id.
    function storyOf(uint256 tokenId) external view returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "ERC721: invalid token");
        return _storyById[tokenId];
    }
}
