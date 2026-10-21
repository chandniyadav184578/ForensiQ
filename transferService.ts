import {
  doc,
  runTransaction,
  setDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { TimelineEvent } from '../types/orbit';

export interface TransferRecord {
  id: string;
  assetId: string;
  tokenId?: number;
  fromAddress: string;
  toAddress: string;
  fromWallet: string;
  toWallet: string;
  fromName: string;
  toName: string;
  status: 'completed' | 'pending' | 'rejected' | 'failed';
  initiatedAt: string;
  completedAt?: string;
  timestamp: string;
  txHash: string;
  transactionHash: string;
  contractAddress?: string;
  network?: string;
  blockNumber?: number;
}

export const transferService = {
  // Execute transfer inside a Firestore transaction after on-chain verification
  async executeTransfer(params: {
    assetId: string;
    tokenId?: number;
    fromAddress: string;
    fromName: string;
    toAddress: string;
    toName: string;
    transferEvent: TimelineEvent;
    contractAddress?: string;
    network?: string;
    blockNumber?: number;
  }): Promise<boolean> {
    const assetRef = doc(db, 'assets', params.assetId);
    const transferId = `transfer-${Date.now()}`;
    const transferRef = doc(db, 'transfers', transferId);
    const eventRef = doc(db, 'assets', params.assetId, 'events', params.transferEvent.id);

    try {
      await runTransaction(db, async transaction => {
        const assetDoc = await transaction.get(assetRef);
        if (!assetDoc.exists()) {
          throw new Error('Asset does not exist in Firestore');
        }

        const assetData = assetDoc.data();
        const currentTimeline = assetData.timeline || [];

        // Update asset ownership in Firestore
        transaction.update(assetRef, {
          currentOwnerAddress: params.toAddress,
          ownerWallet: params.toAddress,
          currentOwnerName: params.toName,
          status: 'ACTIVE',
          updatedAt: new Date().toISOString(),
          timeline: [params.transferEvent, ...currentTimeline],
        });

        // Record transfer document
        transaction.set(transferRef, {
          id: transferId,
          assetId: params.assetId,
          tokenId: params.tokenId || assetData.tokenId || 0,
          fromAddress: params.fromAddress,
          toAddress: params.toAddress,
          fromWallet: params.fromAddress,
          toWallet: params.toAddress,
          fromName: params.fromName,
          toName: params.toName,
          status: 'completed',
          initiatedAt: params.transferEvent.timestamp,
          completedAt: new Date().toISOString(),
          timestamp: new Date().toISOString(),
          txHash: params.transferEvent.txHash,
          transactionHash: params.transferEvent.txHash,
          contractAddress: params.contractAddress || assetData.contractAddress || '',
          network: params.network || 'Sepolia',
          blockNumber: params.blockNumber || params.transferEvent.blockNumber || 0,
        });

        // Record event in subcollection
        transaction.set(eventRef, {
          ...params.transferEvent,
          createdAt: new Date().toISOString(),
        });
      });

      return true;
    } catch (err) {
      console.error('Firestore transfer transaction failed:', err);
      return false;
    }
  },

  // Get transfer history for an asset
  async getTransfersByAsset(assetId: string): Promise<TransferRecord[]> {
    try {
      const transfersRef = collection(db, 'transfers');
      const q = query(transfersRef, where('assetId', '==', assetId));
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data() as TransferRecord);
    } catch {
      return [];
    }
  },
};
