import {
  doc,
  setDoc,
  updateDoc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { TimelineEvent } from '../types/orbit';
import { eventService } from './eventService';

export interface RecoveryClaimRecord {
  id: string;
  assetId: string;
  finderAddress: string;
  contactRelay: string;
  foundLocation: string;
  finderNotes: string;
  handshakeCode: string;
  status: 'PENDING_VERIFICATION' | 'CONFIRMED' | 'RESOLVED';
  createdAt: string;
  resolvedAt?: string;
}

export const recoveryService = {
  // Flag asset as lost
  async markLost(
    assetId: string,
    params: {
      rewardEth: string;
      location: string;
      instructions: string;
    },
    event: TimelineEvent
  ): Promise<boolean> {
    try {
      const assetRef = doc(db, 'assets', assetId);
      const snap = await getDoc(assetRef);
      if (!snap.exists()) return false;

      const currentTimeline = snap.data().timeline || [];

      await updateDoc(assetRef, {
        status: 'LOST',
        recoveryRewardEth: params.rewardEth,
        escrowLocked: true,
        lostDate: event.timestamp,
        lostLocation: params.location,
        lostInstructions: params.instructions,
        timeline: [event, ...currentTimeline],
        updatedAt: new Date().toISOString(),
      });

      await eventService.addEvent(assetId, event);
      return true;
    } catch (err) {
      console.error('Failed to mark lost in Firestore:', err);
      return false;
    }
  },

  // Cancel lost status
  async cancelLost(assetId: string, event: TimelineEvent): Promise<boolean> {
    try {
      const assetRef = doc(db, 'assets', assetId);
      const snap = await getDoc(assetRef);
      if (!snap.exists()) return false;

      const currentTimeline = snap.data().timeline || [];

      await updateDoc(assetRef, {
        status: 'ACTIVE',
        escrowLocked: false,
        activeClaim: null,
        timeline: [event, ...currentTimeline],
        updatedAt: new Date().toISOString(),
      });

      await eventService.addEvent(assetId, event);
      return true;
    } catch (err) {
      console.error('Failed to cancel lost in Firestore:', err);
      return false;
    }
  },

  // Submit recovery claim by finder
  async submitClaim(
    assetId: string,
    params: {
      finderAddress: string;
      contactRelay: string;
      foundLocation: string;
      finderNotes: string;
    },
    handshakeCode: string,
    event: TimelineEvent
  ): Promise<string> {
    const claimId = `claim-${Date.now()}`;
    const claimRef = doc(db, 'recoveryClaims', claimId);

    const claimData: RecoveryClaimRecord = {
      id: claimId,
      assetId,
      finderAddress: params.finderAddress,
      contactRelay: params.contactRelay,
      foundLocation: params.foundLocation,
      finderNotes: params.finderNotes,
      handshakeCode,
      status: 'PENDING_VERIFICATION',
      createdAt: event.timestamp,
    };

    await setDoc(claimRef, claimData);
    await eventService.addEvent(assetId, event);

    const assetRef = doc(db, 'assets', assetId);
    const snap = await getDoc(assetRef);
    if (snap.exists()) {
      const currentTimeline = snap.data().timeline || [];
      await updateDoc(assetRef, {
        status: 'CLAIM_PENDING',
        activeClaim: {
          claimId,
          finderAddress: params.finderAddress,
          finderContactRelay: params.contactRelay,
          foundDate: event.timestamp,
          foundLocation: params.foundLocation,
          finderNotes: params.finderNotes,
          handshakeCode,
          status: 'PENDING_VERIFICATION',
        },
        timeline: [event, ...currentTimeline],
        updatedAt: new Date().toISOString(),
      });
    }

    return handshakeCode;
  },

  // Confirm handover and release reward
  async confirmHandoverAndRelease(
    assetId: string,
    handoverEvent: TimelineEvent,
    rewardEvent: TimelineEvent
  ): Promise<boolean> {
    try {
      const assetRef = doc(db, 'assets', assetId);
      const snap = await getDoc(assetRef);
      if (!snap.exists()) return false;

      const currentTimeline = snap.data().timeline || [];

      await updateDoc(assetRef, {
        status: 'RECOVERED',
        escrowLocked: false,
        activeClaim: null,
        timeline: [rewardEvent, handoverEvent, ...currentTimeline],
        updatedAt: new Date().toISOString(),
      });

      await eventService.addEvent(assetId, handoverEvent);
      await eventService.addEvent(assetId, rewardEvent);

      return true;
    } catch (err) {
      console.error('Failed to confirm handover in Firestore:', err);
      return false;
    }
  },
};
