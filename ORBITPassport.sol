// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ORBITPassport
 * @notice Cryptographic Physical Object Digital Passport & Integrity Registry on Ethereum (ERC-721).
 * Permanently binds physical asset identity, hardware provenance, and lifecycle events to canonical Keccak-256 integrity commitments.
 */
contract ORBITPassport is ERC721, Ownable {
    uint256 private _nextTokenId;

    // Token ID => Canonical Passport Keccak-256 Hash
    mapping(uint256 => bytes32) private _passportHashes;

    // Token ID => Last Update Block Timestamp
    mapping(uint256 => uint256) private _lastUpdated;

    // Token ID => Creation Timestamp
    mapping(uint256 => uint256) private _creationTimestamps;

    // Token ID => Current On-Chain Lifecycle Status (e.g. "ACTIVE", "LOST", "RECOVERED")
    mapping(uint256 => string) private _objectStatuses;

    // Asset ID string (e.g. "orbit-7821") => Token ID
    mapping(string => uint256) private _assetToTokenId;

    // Token ID => Asset ID string
    mapping(uint256 => string) private _tokenToAssetId;

    // Custom Events
    event PassportMinted(uint256 indexed tokenId, string indexed assetId, address indexed owner, bytes32 passportHash);
    event PassportHashUpdated(uint256 indexed tokenId, bytes32 previousHash, bytes32 newHash, address updatedBy);
    event ObjectStatusChanged(uint256 indexed tokenId, string previousStatus, string newStatus, address indexed updatedBy);
    event LifecycleEventRecorded(uint256 indexed tokenId, string eventType, bytes32 indexed eventHash, address indexed actor, uint256 timestamp);

    modifier onlyAuthorized(uint256 tokenId) {
        address tokenOwner = ownerOf(tokenId);
        require(
            msg.sender == tokenOwner || msg.sender == owner() || isApprovedForAll(tokenOwner, msg.sender) || getApproved(tokenId) == msg.sender,
            "ORBIT: caller not authorized to modify passport data"
        );
        _;
    }

    constructor() ERC721("ORBIT Physical Object Passport", "ORBIT") Ownable(msg.sender) {
        _nextTokenId = 1;
    }

    /**
     * @notice Mint a new hardware passport as an ERC-721 NFT and store its initial canonical Keccak-256 integrity hash.
     */
    function mintPassport(
        address to,
        string calldata assetId,
        bytes32 passportHash
    ) external returns (uint256) {
        require(to != address(0), "ORBIT: invalid recipient");
        require(passportHash != bytes32(0), "ORBIT: invalid zero hash");
        require(bytes(assetId).length > 0, "ORBIT: assetId required");
        require(_assetToTokenId[assetId] == 0, "ORBIT: asset already registered");

        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);

        _passportHashes[tokenId] = passportHash;
        _creationTimestamps[tokenId] = block.timestamp;
        _lastUpdated[tokenId] = block.timestamp;
        _objectStatuses[tokenId] = "ACTIVE";
        _assetToTokenId[assetId] = tokenId;
        _tokenToAssetId[tokenId] = assetId;

        emit PassportMinted(tokenId, assetId, to, passportHash);
        return tokenId;
    }

    /**
     * @notice Store or update the on-chain canonical hash when passport data changes.
     */
    function setPassportHash(
        uint256 tokenId,
        bytes32 newHash
    ) external onlyAuthorized(tokenId) {
        _requireOwned(tokenId);
        require(newHash != bytes32(0), "ORBIT: invalid zero hash");

        bytes32 previousHash = _passportHashes[tokenId];
        _passportHashes[tokenId] = newHash;
        _lastUpdated[tokenId] = block.timestamp;

        emit PassportHashUpdated(tokenId, previousHash, newHash, msg.sender);
    }

    /**
     * @notice Update the on-chain canonical hash when passport data changes (with diff check).
     */
    function updatePassportHash(
        uint256 tokenId,
        bytes32 newHash
    ) external onlyAuthorized(tokenId) {
        _requireOwned(tokenId);
        require(newHash != bytes32(0), "ORBIT: invalid zero hash");

        bytes32 previousHash = _passportHashes[tokenId];
        require(previousHash != newHash, "ORBIT: new hash matches current hash");

        _passportHashes[tokenId] = newHash;
        _lastUpdated[tokenId] = block.timestamp;

        emit PassportHashUpdated(tokenId, previousHash, newHash, msg.sender);
    }

    /**
     * @notice Update the on-chain object lifecycle status (e.g. ACTIVE, LOST, RECOVERED).
     */
    function setObjectStatus(
        uint256 tokenId,
        string calldata newStatus
    ) external onlyAuthorized(tokenId) {
        _requireOwned(tokenId);
        require(bytes(newStatus).length > 0, "ORBIT: status cannot be empty");

        string memory previousStatus = _objectStatuses[tokenId];
        _objectStatuses[tokenId] = newStatus;
        _lastUpdated[tokenId] = block.timestamp;

        emit ObjectStatusChanged(tokenId, previousStatus, newStatus, msg.sender);
    }

    /**
     * @notice Commit a cryptographic fingerprint of an immutable lifecycle event to the blockchain.
     */
    function recordLifecycleEvent(
        uint256 tokenId,
        string calldata eventType,
        bytes32 eventHash
    ) external onlyAuthorized(tokenId) {
        _requireOwned(tokenId);
        require(eventHash != bytes32(0), "ORBIT: invalid event hash");

        _lastUpdated[tokenId] = block.timestamp;
        emit LifecycleEventRecorded(tokenId, eventType, eventHash, msg.sender, block.timestamp);
    }

    /**
     * @notice Retrieve the stored on-chain passport hash for a given token ID.
     */
    function getPassportHash(uint256 tokenId) external view returns (bytes32) {
        _requireOwned(tokenId);
        return _passportHashes[tokenId];
    }

    /**
     * @notice Retrieve the on-chain lifecycle status for a token ID.
     */
    function getObjectStatus(uint256 tokenId) external view returns (string memory) {
        _requireOwned(tokenId);
        return _objectStatuses[tokenId];
    }

    /**
     * @notice Retrieve creation timestamp for a token ID.
     */
    function getCreationTimestamp(uint256 tokenId) external view returns (uint256) {
        _requireOwned(tokenId);
        return _creationTimestamps[tokenId];
    }

    /**
     * @notice Cryptographically verify if a supplied local hash matches the authoritative on-chain hash.
     */
    function verifyPassportHash(
        uint256 tokenId,
        bytes32 suppliedHash
    ) external view returns (bool) {
        try this.ownerOf(tokenId) returns (address) {
            return _passportHashes[tokenId] == suppliedHash && suppliedHash != bytes32(0);
        } catch {
            return false;
        }
    }

    /**
     * @notice Get token ID for a registered asset ID string.
     */
    function getTokenIdByAssetId(string calldata assetId) external view returns (uint256) {
        return _assetToTokenId[assetId];
    }

    /**
     * @notice Get asset ID string for a given token ID.
     */
    function getAssetIdByTokenId(uint256 tokenId) external view returns (string memory) {
        _requireOwned(tokenId);
        return _tokenToAssetId[tokenId];
    }

    /**
     * @notice Get last update timestamp for token ID.
     */
    function getLastUpdated(uint256 tokenId) external view returns (uint256) {
        _requireOwned(tokenId);
        return _lastUpdated[tokenId];
    }

    /**
     * @notice Next token ID that will be minted.
     */
    function nextTokenId() external view returns (uint256) {
        return _nextTokenId;
    }
}


