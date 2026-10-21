import {
  doc,
  setDoc,
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  getDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { TimelineEvent } from '../types/orbit';
import { eventService } from './eventService';

export interface RepairRecord {
  id: string;
  assetId: string;
  serviceCenter: string;
  title: string;
  description: string;
  componentsReplaced?: string[];
  costEth?: string;
  invoiceHash?: string;
  timestamp: string;
}

export const repairService = {
  // Record certified repair/maintenance
  async logRepair(
    assetId: string,
    repairData: {
      serviceCenter?: string;
      title: string;
      description: string;
      componentsReplaced?: string[];
      costEth?: string;
      invoiceHash?: string;
    },
    event: TimelineEvent
  ): Promise<boolean> {
    try {
      const repairId = `repair-${Date.now()}`;
      const repairRef = doc(db, 'repairs', repairId);

      const record: RepairRecord = {
        id: repairId,
        assetId,
        serviceCenter: repairData.serviceCenter || 'Certified Service Lab',
        title: repairData.title,
        description: repairData.description,
        componentsReplaced: repairData.componentsReplaced || [],
        costEth: repairData.costEth,
        invoiceHash: repairData.invoiceHash,
        timestamp: event.timestamp,
      };

      await setDoc(repairRef, {
        ...record,
        createdAt: new Date().toISOString(),
      });

      // Add to event timeline subcollection
      await eventService.addEvent(assetId, event);

      // Update asset timeline array
      const assetRef = doc(db, 'assets', assetId);
      const snap = await getDoc(assetRef);
      if (snap.exists()) {
        const currentTimeline = snap.data().timeline || [];
        await updateDoc(assetRef, {
          timeline: [event, ...currentTimeline],
          updatedAt: new Date().toISOString(),
        });
      }

      return true;
    } catch (err) {
      console.error('Failed to log repair to Firestore:', err);
      return false;
    }
  },

  // Get repairs for an asset
  async getRepairsByAsset(assetId: string): Promise<RepairRecord[]> {
    try {
      const repairsRef = collection(db, 'repairs');
      const q = query(repairsRef, where('assetId', '==', assetId));
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data() as RepairRecord);
    } catch {
      return [];
    }
  },
};
