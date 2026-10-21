export type ObjectStatus = 'ACTIVE' | 'LOST' | 'CLAIM_PENDING' | 'TRANSFERRED' | 'RECOVERED';

export type EventType = 
  | 'MINTED' 
  | 'OWNERSHIP_TRANSFERRED' 
  | 'REPAIR_RECORDED' 
  | 'MAINTENANCE' 
  | 'STATUS_LOST' 
  | 'STATUS_FOUND_CLAIM' 
  | 'HANDOVER_CONFIRMED' 
  | 'REWARD_RELEASED' 
  | 'CERTIFIED_INSPECTION';

export interface TimelineEvent {
  id: string;
  type: EventType;
  timestamp: string; // ISO string
  blockNumber: number;
  txHash: string;
  actorAddress: string;
  actorName?: string;
  title: string;
  description: string;
  metadata?: {
    serviceCenter?: string;
    invoiceHash?: string;
    componentsReplaced?: string[];
    costEth?: string;
    recipientAddress?: string;
    rewardEth?: string;
    finderAddress?: string;
    claimLocation?: string;
    handshakeCode?: string;
    verificationNotes?: string;
  };
}

export interface PhysicalObject {
  id: string;               // e.g. "orbit-7821"
  orbitId: string;          // e.g. "ORBIT #7821"
  name: string;             // e.g. "Leica M11 Rangefinder Black Paint"
  category: 'Cameras & Optics' | 'Watches & Luxury' | 'Bicycles & Mobility' | 'Computing & Laptops' | 'Audio & Instruments' | 'Hardware Gear';
  brand: string;
  model: string;
  serialNumber: string;     // Physical serial number
  serialHash: string;       // SHA-256 fingerprint for tamper-check
  manufactureYear: number;
  condition: 'Pristine' | 'Excellent' | 'Good' | 'Fair';
  description: string;
  imageUrl: string;
  registeredAt: string;
  currentOwnerAddress: string;
  currentOwnerName: string;
  status: ObjectStatus;
  
  // Escrow & Recovery details
  recoveryRewardEth: string; // e.g. "0.08"
  escrowLocked: boolean;
  lostDate?: string;
  lostLocation?: string;
  lostInstructions?: string;
  
  // Active Claim (if any)
  activeClaim?: {
    claimId: string;
    finderAddress: string;
    finderContactRelay: string;
    foundDate: string;
    foundLocation: string;
    finderNotes: string;
    handshakeCode: string;
    status: 'PENDING_VERIFICATION' | 'CONFIRMED' | 'RESOLVED';
  };

  timeline: TimelineEvent[];

  // On-Chain Cryptographic Integrity & Hash Commitment
  passportHash?: string;         // Keccak-256 hash of canonical passport data (0x...)
  contractAddress?: string;      // ORBITPassport.sol contract address on Sepolia
  tokenId?: number;              // On-chain NFT / Passport token ID
  hashTransactionHash?: string;  // Tx hash of the commitment on Sepolia
  mintTransactionHash?: string;  // Tx hash of the initial ERC-721 mint on Sepolia
  blockchainStatus?: 'CONFIRMED' | 'UNCOMMITTED' | 'FAILED' | 'PENDING';
  chainId?: number;              // e.g. 11155111 (Sepolia)
  network?: string;              // "Sepolia"
  onChainVerified?: boolean;     // Verified match against on-chain smart contract
  lastVerifiedAt?: string;       // Timestamp of last on-chain verification check
}

export interface PersonaWallet {
  address: string;
  name: string;
  role: 'Collector / Owner' | 'Prospective Buyer' | 'Certified Service Lab' | 'Good Samaritan Finder';
  balanceEth: number;
  avatar: string;
  verifiedBadge?: boolean;
  email?: string;
  username?: string;
}

export interface MarketplaceListing {
  id: string;
  objectId: string;
  sellerAddress: string;
  sellerName: string;
  priceEth: string;
  listedAt: string;
  status: 'ACTIVE' | 'SOLD' | 'CANCELLED';
  soldToAddress?: string;
  soldAt?: string;
}

export interface FilterState {
  search: string;
  category: string;
  status: string;
  onlyMyObjects: boolean;
}
