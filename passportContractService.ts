import { ethers, Contract } from 'ethers';
import { PhysicalObject } from '../types/orbit';
import { computePassportHash } from '../utils/passportHashing';
import artifact from './ORBITPassportArtifact.json';
import {
  SEPOLIA_CHAIN_ID,
  DEFAULT_SEPOLIA_RPC as WALLET_DEFAULT_RPC,
  OrbitError,
  assertDeployed,
  classifyError,
  getReadOnlyProvider,
  getReadySigner,
  orbitDebug,
  validateContractAddress,
} from './wallet';

export const ORBIT_SEPOLIA_CHAIN_ID = SEPOLIA_CHAIN_ID;
export const ORBIT_NETWORK_NAME = 'Ethereum Sepolia';
export const DEFAULT_SEPOLIA_RPC = WALLET_DEFAULT_RPC;

export const ORBIT_PASSPORT_CONTRACT_SEPOLIA =
  (import.meta as any).env?.VITE_ORBIT_PASSPORT_CONTRACT_ADDRESS ||
  (import.meta as any).env?.VITE_ORBIT_PASSPORT_CONTRACT ||
  '';

/**
 * Env (.env deployment config) is authoritative. localStorage is only a manual fallback from the
 * settings modal, so a stale browser value can never override a valid deployment configuration.
 */
export function getStoredContractAddress(): string {
  const fromEnv = ORBIT_PASSPORT_CONTRACT_SEPOLIA;
  if (fromEnv && ethers.isAddress(fromEnv)) return fromEnv;
  if (typeof window !== 'undefined') {
    const fromStorage = localStorage.getItem('orbit_passport_contract_address');
    if (fromStorage && ethers.isAddress(fromStorage)) return fromStorage;
  }
  return '';
}

export function setStoredContractAddress(address: string): void {
  if (typeof window !== 'undefined') {
    if (address && ethers.isAddress(address)) {
      localStorage.setItem('orbit_passport_contract_address', address);
    } else {
      localStorage.removeItem('orbit_passport_contract_address');
    }
  }
}

export interface IntegrityVerificationResult {
  isVerified: boolean;
  status: 'VERIFIED_ON_CHAIN' | 'DATA_MISMATCH' | 'UNCOMMITTED' | 'TOKEN_NOT_FOUND' | 'CONTRACT_NOT_CONFIGURED';
  currentHash: string;
  onChainHash: string;
  contractAddress: string;
  tokenId: number;
  onChainOwner?: string;
  hashTransactionHash?: string;
  mintTransactionHash?: string;
  chainId: number;
  network: string;
  verifiedAt: string;
  comparisonDetails: {
    hashesMatch: boolean;
    localHashCalculated: string;
    onChainHashRetrieved: string;
    queriedVia: 'Sepolia Smart Contract' | 'Sepolia Public RPC' | 'Not Connected';
  };
  explorerUrls?: {
    txUrl?: string;
    mintTxUrl?: string;
    contractUrl: string;
    tokenUrl: string;
    ownerUrl?: string;
  };
  error?: string;
}

/** Sends a contract call, waits for 1 confirmation, and throws a classified OrbitError on any failure. */
async function sendAndConfirm(send: () => Promise<any>, context: string): Promise<{ hash: string; receipt: any }> {
  let tx: any;
  try {
    tx = await send();
  } catch (err) {
    throw classifyError(err, context);
  }
  let receipt: any;
  try {
    receipt = await tx.wait(1);
  } catch (err) {
    const e = classifyError(err, context);
    e.txHash = e.txHash || tx.hash;
    throw e;
  }
  if (!receipt || receipt.status !== 1) {
    throw new OrbitError('TX_REVERTED', `${context} reverted on Sepolia.`, tx.hash);
  }
  return { hash: tx.hash, receipt };
}

export const passportContractService = {
  getContractAddress(): string {
    return getStoredContractAddress();
  },

  hasContract(): boolean {
    const addr = getStoredContractAddress();
    return Boolean(addr && ethers.isAddress(addr) && addr !== ethers.ZeroAddress);
  },

  /**
   * Returns a read-only contract instance connected via Sepolia public RPC or BrowserProvider.
   */
  getReadOnlyContract(contractAddress?: string): Contract {
    const address = validateContractAddress(contractAddress || getStoredContractAddress(), 'ORBIT Passport contract');
    // Always the Sepolia public RPC: reads never depend on the wallet's current chain.
    return new Contract(address, artifact.abi, getReadOnlyProvider());
  },

  /** Verifies code exists at the address on Sepolia and that it speaks the ORBIT Passport ABI. */
  async preflight(contractAddress?: string): Promise<string> {
    const address = validateContractAddress(contractAddress || getStoredContractAddress(), 'ORBIT Passport contract');
    await assertDeployed(address, 'ORBITPassport', async provider => {
      const c = new Contract(address, artifact.abi, provider);
      await c.nextTokenId();
      await c.supportsInterface('0x80ac58cd'); // ERC-721
    });
    return address;
  },

  /**
   * Returns an active signer and contract instance for executing transactions on Sepolia.
   */
  async getSignerContract(contractAddress?: string, expectedSigner?: string): Promise<{ contract: Contract; signer: any; address: string; chainId: number }> {
    const address = await this.preflight(contractAddress);
    // Requires a connected MetaMask account already on Sepolia; never prompts silently.
    const { signer, address: signerAddress, chainId } = await getReadySigner(expectedSigner);
    orbitDebug('passport.signer', { contract: address, signer: signerAddress, chainId });
    return { contract: new Contract(address, artifact.abi, signer), signer, address: signerAddress, chainId };
  },

  /**
   * Mint a real ERC-721 Digital Object Passport on Ethereum Sepolia.
   */
  async mintPassportOnChain(params: {
    assetId: string;
    passportHash: string;
    recipientAddress: string;
    contractAddress?: string;
  }): Promise<{
    tokenId: number;
    txHash: string;
    blockNumber: number;
    contractAddress: string;
    owner: string;
  }> {
    const targetContract = validateContractAddress(
      params.contractAddress || getStoredContractAddress(),
      'ORBIT Passport contract'
    );
    if (!ethers.isAddress(params.recipientAddress)) {
      throw new OrbitError('UNKNOWN', `Invalid recipient Ethereum address: ${params.recipientAddress}`);
    }

    // The signer must be the account ORBIT believes is minting.
    const { contract } = await this.getSignerContract(targetContract, params.recipientAddress);

    let tx: any;
    try {
      tx = await contract.mintPassport(params.recipientAddress, params.assetId, params.passportHash);
    } catch (err) {
      throw classifyError(err, 'Minting passport');
    }

    let receipt: any;
    try {
      receipt = await tx.wait(1);
    } catch (err) {
      const e = classifyError(err, 'Minting passport');
      e.txHash = e.txHash || tx.hash;
      throw e;
    }
    if (!receipt || receipt.status !== 1) {
      throw new OrbitError('TX_REVERTED', `Mint transaction reverted on Sepolia.`, tx.hash);
    }

    // Read the REAL token id from the PassportMinted event in this receipt. No guessing.
    let tokenId = 0;
    for (const log of receipt.logs || []) {
      if (log.address?.toLowerCase() !== targetContract.toLowerCase()) continue;
      try {
        const parsed = contract.interface.parseLog(log);
        if (parsed?.name === 'PassportMinted') {
          tokenId = Number(parsed.args.tokenId);
          break;
        }
      } catch {
        // unrelated log
      }
    }
    if (!tokenId) {
      // Fallback: authoritative contract lookup by asset id (still a real chain read).
      tokenId = Number(await this.getReadOnlyContract(targetContract).getTokenIdByAssetId(params.assetId));
    }
    if (!tokenId) {
      throw new OrbitError('ABI_MISMATCH', `Mint confirmed (${tx.hash}) but no token ID could be read from the receipt or contract. Check the ABI matches the deployed contract.`, tx.hash);
    }

    const onChainOwner = await contract.ownerOf(tokenId);
    return {
      tokenId,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      contractAddress: targetContract,
      owner: onChainOwner,
    };
  },

  /**
   * Execute real on-chain ERC-721 ownership transfer on Ethereum Sepolia.
   * Uses standard safeTransferFrom(from, to, tokenId) and verifies ownerOf(tokenId) on-chain.
   */
  async transferPassportOnChain(params: {
    tokenId: number;
    fromAddress: string;
    toAddress: string;
    contractAddress?: string;
  }): Promise<{
    txHash: string;
    blockNumber: number;
    newOwner: string;
    contractAddress: string;
    verifiedOnChain: boolean;
  }> {
    const targetContract = validateContractAddress(
      params.contractAddress || getStoredContractAddress(),
      'ORBIT Passport contract'
    );
    if (!params.tokenId || params.tokenId <= 0) {
      throw new OrbitError('UNKNOWN', `Invalid token ID: ${params.tokenId}`);
    }
    if (!ethers.isAddress(params.toAddress) || params.toAddress === ethers.ZeroAddress) {
      throw new OrbitError('UNKNOWN', 'Recipient address is invalid or is the zero address.');
    }

    const { contract, address: signerAddress } = await this.getSignerContract(targetContract, params.fromAddress);

    let onChainOwner: string;
    try {
      onChainOwner = await contract.ownerOf(params.tokenId);
    } catch (err) {
      throw new OrbitError('TX_REVERTED', `Token #${params.tokenId} does not exist on this contract.`);
    }
    if (onChainOwner.toLowerCase() !== signerAddress.toLowerCase()) {
      throw new OrbitError(
        'SIGNER_MISMATCH',
        `Connected wallet (${signerAddress.slice(0, 6)}...${signerAddress.slice(-4)}) is not the on-chain owner (${onChainOwner.slice(0, 6)}...${onChainOwner.slice(-4)}) of Token #${params.tokenId}.`
      );
    }
    if (onChainOwner.toLowerCase() === params.toAddress.toLowerCase()) {
      throw new OrbitError('UNKNOWN', 'Recipient wallet is already the current on-chain owner.');
    }

    const { hash, receipt } = await sendAndConfirm(
      () => contract['safeTransferFrom(address,address,uint256)'](onChainOwner, params.toAddress, params.tokenId),
      'Passport transfer'
    );

    // Verify the result directly on chain via read-only RPC.
    const verifiedOwner = await this.getReadOnlyContract(targetContract).ownerOf(params.tokenId);
    if (verifiedOwner.toLowerCase() !== params.toAddress.toLowerCase()) {
      throw new OrbitError('TX_REVERTED', `ownerOf(#${params.tokenId}) returned ${verifiedOwner}, expected ${params.toAddress}.`, hash);
    }

    return {
      txHash: hash,
      blockNumber: receipt.blockNumber,
      newOwner: verifiedOwner,
      contractAddress: targetContract,
      verifiedOnChain: true,
    };
  },

  /**
   * Commits or updates the canonical passport hash on Ethereum Sepolia.
   */
  async submitPassportHashOnChain(
    obj: PhysicalObject,
    tokenId: number
  ): Promise<{
    passportHash: string;
    hashTransactionHash: string;
    blockNumber: number;
    contractAddress: string;
    tokenId: number;
  }> {
    const targetContract = validateContractAddress(
      obj.contractAddress || getStoredContractAddress(),
      'ORBIT Passport contract'
    );
    const passportHash = computePassportHash(obj);
    const { contract } = await this.getSignerContract(targetContract);

    const { hash, receipt } = await sendAndConfirm(
      () => contract.setPassportHash(tokenId, passportHash),
      'Committing passport hash'
    );

    return {
      passportHash,
      hashTransactionHash: hash,
      blockNumber: receipt.blockNumber,
      contractAddress: targetContract,
      tokenId,
    };
  },

  /**
   * Public cryptographic integrity verification against the Ethereum Sepolia smart contract.
   */
  async verifyPassport(obj: PhysicalObject): Promise<IntegrityVerificationResult> {
    const currentHash = computePassportHash(obj).toLowerCase();
    const tokenId = obj.tokenId || 0;
    const contractAddress = obj.contractAddress || getStoredContractAddress();
    const verifiedAt = new Date().toISOString();

    if (!contractAddress || !ethers.isAddress(contractAddress)) {
      return {
        isVerified: false,
        status: 'CONTRACT_NOT_CONFIGURED',
        currentHash,
        onChainHash: ethers.ZeroHash,
        contractAddress: '',
        tokenId,
        chainId: SEPOLIA_CHAIN_ID,
        network: ORBIT_NETWORK_NAME,
        verifiedAt,
        comparisonDetails: {
          hashesMatch: false,
          localHashCalculated: currentHash,
          onChainHashRetrieved: ethers.ZeroHash,
          queriedVia: 'Not Connected',
        },
        error: 'ORBIT contract address is not configured. Set VITE_ORBIT_PASSPORT_CONTRACT_ADDRESS.',
      };
    }

    if (!tokenId || tokenId <= 0) {
      return {
        isVerified: false,
        status: 'UNCOMMITTED',
        currentHash,
        onChainHash: ethers.ZeroHash,
        contractAddress,
        tokenId,
        chainId: SEPOLIA_CHAIN_ID,
        network: ORBIT_NETWORK_NAME,
        verifiedAt,
        comparisonDetails: {
          hashesMatch: false,
          localHashCalculated: currentHash,
          onChainHashRetrieved: ethers.ZeroHash,
          queriedVia: 'Sepolia Public RPC',
        },
      };
    }

    try {
      const contract = this.getReadOnlyContract(contractAddress);
      const [onChainHashRaw, onChainOwner] = await Promise.all([
        contract.getPassportHash(tokenId).catch(() => ethers.ZeroHash),
        contract.ownerOf(tokenId).catch(() => undefined),
      ]);

      const onChainHash = (onChainHashRaw || ethers.ZeroHash).toLowerCase();

      if (!onChainHash || onChainHash === ethers.ZeroHash) {
        return {
          isVerified: false,
          status: 'UNCOMMITTED',
          currentHash,
          onChainHash: ethers.ZeroHash,
          contractAddress,
          tokenId,
          onChainOwner,
          hashTransactionHash: obj.hashTransactionHash,
          mintTransactionHash: obj.mintTransactionHash,
          chainId: SEPOLIA_CHAIN_ID,
          network: ORBIT_NETWORK_NAME,
          verifiedAt,
          comparisonDetails: {
            hashesMatch: false,
            localHashCalculated: currentHash,
            onChainHashRetrieved: ethers.ZeroHash,
            queriedVia: 'Sepolia Smart Contract',
          },
          explorerUrls: {
            txUrl: obj.hashTransactionHash ? `https://sepolia.etherscan.io/tx/${obj.hashTransactionHash}` : undefined,
            mintTxUrl: obj.mintTransactionHash ? `https://sepolia.etherscan.io/tx/${obj.mintTransactionHash}` : undefined,
            contractUrl: `https://sepolia.etherscan.io/address/${contractAddress}`,
            tokenUrl: `https://sepolia.etherscan.io/token/${contractAddress}?a=${tokenId}`,
            ownerUrl: onChainOwner ? `https://sepolia.etherscan.io/address/${onChainOwner}` : undefined,
          },
        };
      }

      const hashesMatch = currentHash === onChainHash;

      return {
        isVerified: hashesMatch,
        status: hashesMatch ? 'VERIFIED_ON_CHAIN' : 'DATA_MISMATCH',
        currentHash,
        onChainHash,
        contractAddress,
        tokenId,
        onChainOwner,
        hashTransactionHash: obj.hashTransactionHash,
        mintTransactionHash: obj.mintTransactionHash,
        chainId: SEPOLIA_CHAIN_ID,
        network: ORBIT_NETWORK_NAME,
        verifiedAt,
        comparisonDetails: {
          hashesMatch,
          localHashCalculated: currentHash,
          onChainHashRetrieved: onChainHash,
          queriedVia: 'Sepolia Smart Contract',
        },
        explorerUrls: {
          txUrl: obj.hashTransactionHash ? `https://sepolia.etherscan.io/tx/${obj.hashTransactionHash}` : undefined,
          mintTxUrl: obj.mintTransactionHash ? `https://sepolia.etherscan.io/tx/${obj.mintTransactionHash}` : undefined,
          contractUrl: `https://sepolia.etherscan.io/address/${contractAddress}`,
          tokenUrl: `https://sepolia.etherscan.io/token/${contractAddress}?a=${tokenId}`,
          ownerUrl: onChainOwner ? `https://sepolia.etherscan.io/address/${onChainOwner}` : undefined,
        },
      };
    } catch (err: any) {
      console.warn('Smart contract verification query error:', err);
      return {
        isVerified: false,
        status: 'TOKEN_NOT_FOUND',
        currentHash,
        onChainHash: ethers.ZeroHash,
        contractAddress,
        tokenId,
        chainId: SEPOLIA_CHAIN_ID,
        network: ORBIT_NETWORK_NAME,
        verifiedAt,
        comparisonDetails: {
          hashesMatch: false,
          localHashCalculated: currentHash,
          onChainHashRetrieved: ethers.ZeroHash,
          queriedVia: 'Sepolia Public RPC',
        },
        error: err.message || 'Token not found on Sepolia contract',
      };
    }
  },

  /**
   * Commit an immutable cryptographic fingerprint of a lifecycle event to the Sepolia blockchain.
   */
  async recordLifecycleEventOnChain(params: {
    tokenId: number;
    eventType: string;
    eventHash: string;
    contractAddress?: string;
  }): Promise<{ txHash: string; blockNumber: number; eventHash: string }> {
    const { contract } = await this.getSignerContract(params.contractAddress);
    const formattedHash = params.eventHash.startsWith('0x') ? params.eventHash : `0x${params.eventHash}`;
    const { hash, receipt } = await sendAndConfirm(
      () => contract.recordLifecycleEvent(params.tokenId, params.eventType, formattedHash),
      'Recording lifecycle event'
    );
    return { txHash: hash, blockNumber: receipt.blockNumber, eventHash: formattedHash };
  },

  /**
   * Update the on-chain lifecycle status (ACTIVE, LOST, RECOVERED) in the smart contract.
   */
  async setObjectStatusOnChain(params: {
    tokenId: number;
    status: string;
    contractAddress?: string;
  }): Promise<{ txHash: string; blockNumber: number; status: string }> {
    const { contract } = await this.getSignerContract(params.contractAddress);
    const { hash, receipt } = await sendAndConfirm(
      () => contract.setObjectStatus(params.tokenId, params.status),
      'Updating on-chain status'
    );
    return { txHash: hash, blockNumber: receipt.blockNumber, status: params.status };
  },

  /**
   * Direct public query to Ethereum Sepolia with NO login, NO auth, NO MetaMask required.
   */
  async queryPublicPassportDirectly(
    contractAddress: string,
    tokenId: number
  ): Promise<{
    success: boolean;
    tokenId: number;
    contractAddress: string;
    network: string;
    chainId: number;
    owner?: string;
    passportHash?: string;
    objectStatus?: string;
    creationTimestamp?: string;
    lastUpdated?: string;
    assetId?: string;
    explorerUrls: {
      contractUrl: string;
      tokenUrl: string;
      ownerUrl?: string;
    };
    error?: string;
  }> {
    const cleanContract = contractAddress?.trim();
    if (!cleanContract || !ethers.isAddress(cleanContract)) {
      return {
        success: false,
        tokenId,
        contractAddress: cleanContract || '',
        network: ORBIT_NETWORK_NAME,
        chainId: SEPOLIA_CHAIN_ID,
        explorerUrls: {
          contractUrl: '',
          tokenUrl: '',
        },
        error: 'Invalid contract address',
      };
    }

    try {
      const contract = new Contract(cleanContract, artifact.abi, getReadOnlyProvider());

      const [owner, passportHash, status, creationTime, lastUpdated, assetId] = await Promise.all([
        contract.ownerOf(tokenId).catch(() => undefined),
        contract.getPassportHash(tokenId).catch(() => undefined),
        contract.getObjectStatus(tokenId).catch(() => 'ACTIVE'),
        contract.getCreationTimestamp(tokenId).catch(() => 0n),
        contract.getLastUpdated(tokenId).catch(() => 0n),
        contract.getAssetIdByTokenId(tokenId).catch(() => undefined),
      ]);

      const creationIso = creationTime && creationTime > 0n
        ? new Date(Number(creationTime) * 1000).toISOString()
        : undefined;

      const lastUpdatedIso = lastUpdated && lastUpdated > 0n
        ? new Date(Number(lastUpdated) * 1000).toISOString()
        : undefined;

      return {
        success: Boolean(owner),
        tokenId,
        contractAddress: cleanContract,
        network: ORBIT_NETWORK_NAME,
        chainId: SEPOLIA_CHAIN_ID,
        owner,
        passportHash,
        objectStatus: status,
        creationTimestamp: creationIso,
        lastUpdated: lastUpdatedIso,
        assetId,
        explorerUrls: {
          contractUrl: `https://sepolia.etherscan.io/address/${cleanContract}`,
          tokenUrl: `https://sepolia.etherscan.io/token/${cleanContract}?a=${tokenId}`,
          ownerUrl: owner ? `https://sepolia.etherscan.io/address/${owner}` : undefined,
        },
      };
    } catch (err: any) {
      return {
        success: false,
        tokenId,
        contractAddress: cleanContract,
        network: ORBIT_NETWORK_NAME,
        chainId: SEPOLIA_CHAIN_ID,
        explorerUrls: {
          contractUrl: `https://sepolia.etherscan.io/address/${cleanContract}`,
          tokenUrl: `https://sepolia.etherscan.io/token/${cleanContract}?a=${tokenId}`,
        },
        error: err.message || 'Token not found or RPC query failed',
      };
    }
  },
};


