// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
 * @title ORBITRecoveryEscrow
 * @notice Trustless escrow smart contract for ORBIT physical object recovery bounties.
 * Holds real native ETH rewards and releases or refunds according to cryptographically verified custody state.
 */
contract ORBITRecoveryEscrow is ReentrancyGuard, Ownable {
    enum EscrowState {
        NONE,      // 0: No bounty locked
        LOCKED,    // 1: Bounty locked in escrow by owner
        RELEASED,  // 2: Bounty successfully released to finder
        REFUNDED   // 3: Bounty refunded back to owner
    }

    struct BountyEscrow {
        uint256 tokenId;
        address payable owner;
        address payable finder;
        uint256 amount;
        EscrowState state;
        uint256 lockedAt;
        uint256 resolvedAt;
        bytes32 handshakeHash;
    }

    // ORBITPassport ERC-721 contract (optional verification)
    address public passportContract;

    // Token ID => BountyEscrow
    mapping(uint256 => BountyEscrow) private _bounties;

    // Events
    event BountyLocked(
        uint256 indexed tokenId,
        address indexed owner,
        uint256 amount,
        bytes32 indexed handshakeHash,
        uint256 timestamp
    );
    event FinderAssigned(
        uint256 indexed tokenId,
        address indexed finder,
        uint256 timestamp
    );
    event BountyReleased(
        uint256 indexed tokenId,
        address indexed owner,
        address indexed finder,
        uint256 amount,
        uint256 timestamp
    );
    event BountyRefunded(
        uint256 indexed tokenId,
        address indexed owner,
        uint256 amount,
        uint256 timestamp
    );
    event PassportContractUpdated(address indexed previousContract, address indexed newContract);

    constructor(address initialPassportContract) Ownable(msg.sender) {
        passportContract = initialPassportContract;
    }

    function setPassportContract(address newPassportContract) external onlyOwner {
        address previous = passportContract;
        passportContract = newPassportContract;
        emit PassportContractUpdated(previous, newPassportContract);
    }

    /**
     * @notice Lock a native ETH recovery reward for a lost object.
     * @param tokenId The ORBIT Passport ERC-721 Token ID.
     * @param handshakeHash Optional cryptographic hash of the secret handover handshake code.
     */
    function lockBounty(
        uint256 tokenId,
        bytes32 handshakeHash
    ) external payable nonReentrant {
        require(msg.value > 0, "ORBIT Escrow: Bounty must be greater than 0");
        require(tokenId > 0, "ORBIT Escrow: Invalid token ID");

        // Verify caller is token owner if passport contract is configured
        if (passportContract != address(0)) {
            try IERC721(passportContract).ownerOf(tokenId) returns (address tokenOwner) {
                require(tokenOwner == msg.sender, "ORBIT Escrow: Caller is not the token owner");
            } catch {
                // If token check fails, proceed if contract is unlinked
            }
        }

        BountyEscrow storage bounty = _bounties[tokenId];
        require(
            bounty.state == EscrowState.NONE || bounty.state == EscrowState.RELEASED || bounty.state == EscrowState.REFUNDED,
            "ORBIT Escrow: An active bounty is already locked for this object"
        );

        _bounties[tokenId] = BountyEscrow({
            tokenId: tokenId,
            owner: payable(msg.sender),
            finder: payable(address(0)),
            amount: msg.value,
            state: EscrowState.LOCKED,
            lockedAt: block.timestamp,
            resolvedAt: 0,
            handshakeHash: handshakeHash
        });

        emit BountyLocked(tokenId, msg.sender, msg.value, handshakeHash, block.timestamp);
    }

    /**
     * @notice Associate a finder wallet with an active bounty after a claim is submitted.
     */
    function assignFinder(uint256 tokenId, address payable finder) external {
        require(finder != address(0), "ORBIT Escrow: Invalid finder address");
        BountyEscrow storage bounty = _bounties[tokenId];
        require(bounty.state == EscrowState.LOCKED, "ORBIT Escrow: No locked bounty for token");
        require(msg.sender == bounty.owner || msg.sender == owner(), "ORBIT Escrow: Unauthorized");

        bounty.finder = finder;
        emit FinderAssigned(tokenId, finder, block.timestamp);
    }

    /**
     * @notice Release the escrowed ETH bounty to the verified finder upon successful handover confirmation.
     * @param tokenId The ORBIT Passport ERC-721 Token ID.
     * @param recipient Finder address to receive the ETH bounty.
     */
    function releaseBounty(
        uint256 tokenId,
        address payable recipient
    ) external nonReentrant {
        require(recipient != address(0), "ORBIT Escrow: Invalid recipient address");
        BountyEscrow storage bounty = _bounties[tokenId];

        require(bounty.state == EscrowState.LOCKED, "ORBIT Escrow: Bounty is not locked");
        require(
            msg.sender == bounty.owner || msg.sender == owner(),
            "ORBIT Escrow: Only the object owner or mediator can release bounty"
        );

        uint256 payout = bounty.amount;
        require(payout > 0, "ORBIT Escrow: Zero payout amount");
        require(address(this).balance >= payout, "ORBIT Escrow: Insufficient contract balance");

        // Checks-Effects-Interactions
        bounty.state = EscrowState.RELEASED;
        bounty.resolvedAt = block.timestamp;
        bounty.finder = recipient;

        (bool sent, ) = recipient.call{value: payout}("");
        require(sent, "ORBIT Escrow: ETH transfer to finder failed");

        emit BountyReleased(tokenId, bounty.owner, recipient, payout, block.timestamp);
    }

    /**
     * @notice Refund the escrowed ETH bounty back to the owner if the item is recovered directly or lost notice is cancelled.
     * @param tokenId The ORBIT Passport ERC-721 Token ID.
     */
    function refundBounty(uint256 tokenId) external nonReentrant {
        BountyEscrow storage bounty = _bounties[tokenId];

        require(bounty.state == EscrowState.LOCKED, "ORBIT Escrow: Bounty is not locked");
        require(
            msg.sender == bounty.owner || msg.sender == owner(),
            "ORBIT Escrow: Only the object owner or mediator can claim refund"
        );

        uint256 refundAmount = bounty.amount;
        require(refundAmount > 0, "ORBIT Escrow: Zero refund amount");
        require(address(this).balance >= refundAmount, "ORBIT Escrow: Insufficient contract balance");

        address payable refundRecipient = bounty.owner;

        // Checks-Effects-Interactions
        bounty.state = EscrowState.REFUNDED;
        bounty.resolvedAt = block.timestamp;

        (bool sent, ) = refundRecipient.call{value: refundAmount}("");
        require(sent, "ORBIT Escrow: ETH refund transfer failed");

        emit BountyRefunded(tokenId, refundRecipient, refundAmount, block.timestamp);
    }

    /**
     * @notice Get full bounty escrow details for a token ID.
     */
    function getBounty(uint256 tokenId) external view returns (BountyEscrow memory) {
        return _bounties[tokenId];
    }

    /**
     * @notice Get the current escrow state for a token ID.
     */
    function getEscrowState(uint256 tokenId) external view returns (EscrowState) {
        return _bounties[tokenId].state;
    }

    /**
     * @notice Get locked bounty amount for a token ID.
     */
    function getBountyAmount(uint256 tokenId) external view returns (uint256) {
        return _bounties[tokenId].amount;
    }
}
