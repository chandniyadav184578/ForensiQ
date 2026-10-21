import { ethers, Contract } from 'ethers';
import artifact from './ORBITRecoveryEscrowArtifact.json';
import {
  OrbitError,
  assertDeployed,
  classifyError,
  getReadOnlyProvider,
  getReadySigner,
  orbitDebug,
  validateContractAddress,
} from './wallet';
import { getStoredContractAddress as getPassportAddress } from './passportContractService';

export const ORBIT_ESCROW_CONTRACT_SEPOLIA =
  (import.meta as any).env?.VITE_ORBIT_ESCROW_CONTRACT_ADDRESS ||
  (import.meta as any).env?.VITE_ORBIT_ESCROW_CONTRACT ||
  '';

/** Env is authoritative; localStorage is only a manual fallback. Returns '' when nothing valid is set. */
export function getStoredEscrowContractAddress(): string {
  const fromEnv = ORBIT_ESCROW_CONTRACT_SEPOLIA;
  if (fromEnv && ethers.isAddress(fromEnv)) return fromEnv;
  if (typeof window !== 'undefined') {
    const fromStorage = localStorage.getItem('orbit_escrow_contract_address');
    if (fromStorage && ethers.isAddress(fromStorage)) return fromStorage;
  }
  return '';
}

export function setStoredEscrowContractAddress(address: string): void {
  if (typeof window !== 'undefined') {
    if (address && ethers.isAddress(address)) {
      localStorage.setItem('orbit_escrow_contract_address', address);
    } else {
      localStorage.removeItem('orbit_escrow_contract_address');
    }
  }
}

export type EscrowStateType = 'NONE' | 'LOCKED' | 'RELEASED' | 'REFUNDED';

export interface EscrowBountyDetails {
  tokenId: number;
  owner: string;
  finder: string;
  amountEth: string;
  state: EscrowStateType;
  lockedAt: string;
  resolvedAt?: string;
  handshakeHash?: string;
}

const STATE_MAP: EscrowStateType[] = ['NONE', 'LOCKED', 'RELEASED', 'REFUNDED'];

export const escrowContractService = {
  getContractAddress(): string {
    return getStoredEscrowContractAddress();
  },

  hasContract(): boolean {
    const addr = getStoredEscrowContractAddress();
    return Boolean(addr && ethers.isAddress(addr) && addr !== ethers.ZeroAddress);
  },

  getReadOnlyContract(contractAddress?: string): Contract {
    const address = validateContractAddress(contractAddress || getStoredEscrowContractAddress(), 'ORBIT Recovery Escrow contract');
    return new Contract(address, artifact.abi, getReadOnlyProvider());
  },

  /** Verifies the escrow is deployed on Sepolia, speaks the expected ABI, and is linked to the configured passport. */
  async preflight(contractAddress?: string): Promise<string> {
    const address = validateContractAddress(contractAddress || getStoredEscrowContractAddress(), 'ORBIT Recovery Escrow contract');
    await assertDeployed(address, 'ORBITRecoveryEscrow', async provider => {
      const c = new Contract(address, artifact.abi, provider);
      await c.getEscrowState(0);
      const linked: string = await c.passportContract();
      const configured = getPassportAddress();
      if (configured && linked !== ethers.ZeroAddress && linked.toLowerCase() !== configured.toLowerCase()) {
        orbitDebug('escrow.preflight', { warning: 'escrow.passportContract differs from configured passport', linked, configured });
      }
    });
    return address;
  },

  async getSignerContract(contractAddress?: string, expectedSigner?: string): Promise<{ contract: Contract; signer: any; address: string; signerAddress: string }> {
    const address = await this.preflight(contractAddress);
    const { signer, address: signerAddress } = await getReadySigner(expectedSigner);
    orbitDebug('escrow.signer', { contract: address, signer: signerAddress });
    return { contract: new Contract(address, artifact.abi, signer), signer, address, signerAddress };
  },

  async _send(send: () => Promise<any>, context: string): Promise<{ hash: string; receipt: any }> {
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
    if (!receipt || receipt.status !== 1) throw new OrbitError('TX_REVERTED', `${context} reverted on Sepolia.`, tx.hash);
    return { hash: tx.hash, receipt };
  },

  /**
   * Lock real native Sepolia ETH in ORBITRecoveryEscrow for a lost object.
   */
  async lockBountyOnChain(params: {
    tokenId: number;
    amountEth: string;
    handshakeCode?: string;
    ownerAddress?: string;
    contractAddress?: string;
  }): Promise<{ txHash: string; blockNumber: number; amountEth: string; contractAddress: string }> {
    let parsedValue: bigint;
    try {
      parsedValue = ethers.parseEther(params.amountEth);
    } catch {
      throw new OrbitError('UNKNOWN', `Invalid bounty amount: "${params.amountEth}"`);
    }
    if (parsedValue <= 0n) throw new OrbitError('UNKNOWN', 'Bounty amount must be greater than 0 ETH');

    const { contract, address: targetContract } = await this.getSignerContract(params.contractAddress, params.ownerAddress);

    const handshakeHash = params.handshakeCode
      ? ethers.keccak256(ethers.toUtf8Bytes(params.handshakeCode.trim().toUpperCase()))
      : ethers.ZeroHash;

    const { hash, receipt } = await this._send(
      () => contract.lockBounty(params.tokenId, handshakeHash, { value: parsedValue }),
      'Locking bounty'
    );
    return { txHash: hash, blockNumber: receipt.blockNumber, amountEth: params.amountEth, contractAddress: targetContract };
  },

  /**
   * Release locked ETH bounty to verified finder upon confirmed physical handover.
   */
  async releaseBountyOnChain(params: {
    tokenId: number;
    finderAddress: string;
    contractAddress?: string;
  }): Promise<{ txHash: string; blockNumber: number; finderAddress: string }> {
    if (!ethers.isAddress(params.finderAddress) || params.finderAddress === ethers.ZeroAddress) {
      throw new OrbitError('UNKNOWN', 'Invalid finder address for bounty release.');
    }
    const { contract } = await this.getSignerContract(params.contractAddress);
    const { hash, receipt } = await this._send(
      () => contract.releaseBounty(params.tokenId, params.finderAddress),
      'Releasing bounty'
    );
    return { txHash: hash, blockNumber: receipt.blockNumber, finderAddress: params.finderAddress };
  },

  /**
   * Refund locked ETH bounty back to owner if item recovered directly or lost notice cancelled.
   */
  async refundBountyOnChain(params: {
    tokenId: number;
    contractAddress?: string;
  }): Promise<{ txHash: string; blockNumber: number }> {
    const { contract } = await this.getSignerContract(params.contractAddress);
    const { hash, receipt } = await this._send(() => contract.refundBounty(params.tokenId), 'Refunding bounty');
    return { txHash: hash, blockNumber: receipt.blockNumber };
  },

  /**
   * Query authoritative escrow state and locked balance directly from the smart contract.
   */
  async getOnChainBounty(
    tokenId: number,
    contractAddress?: string
  ): Promise<EscrowBountyDetails | null> {
    try {
      const contract = this.getReadOnlyContract(contractAddress);
      const rawBounty = await contract.getBounty(tokenId);

      const stateIndex = Number(rawBounty.state);
      const state = STATE_MAP[stateIndex] || 'NONE';

      if (state === 'NONE' && rawBounty.amount === 0n) {
        return null;
      }

      return {
        tokenId: Number(rawBounty.tokenId),
        owner: rawBounty.owner,
        finder: rawBounty.finder,
        amountEth: ethers.formatEther(rawBounty.amount),
        state,
        lockedAt: rawBounty.lockedAt > 0n ? new Date(Number(rawBounty.lockedAt) * 1000).toISOString() : '',
        resolvedAt: rawBounty.resolvedAt > 0n ? new Date(Number(rawBounty.resolvedAt) * 1000).toISOString() : undefined,
        handshakeHash: rawBounty.handshakeHash !== ethers.ZeroHash ? rawBounty.handshakeHash : undefined,
      };
    } catch (err) {
      console.warn(`Could not read on-chain bounty for token #${tokenId}:`, err);
      return null;
    }
  },
};
