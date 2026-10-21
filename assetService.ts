import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PhysicalObject, TimelineEvent } from '../types/orbit';
import { eventService } from './eventService';

const ASSETS_COLLECTION = 'assets';

let hasSeededShowcase = false;

export const assetService = {
  // Subscribe to real-time asset updates (pure read, NEVER write)
  subscribeToAssets(onUpdate: (assets: PhysicalObject[]) => void): Unsubscribe {
    const assetsRef = collection(db, ASSETS_COLLECTION);

    return onSnapshot(
      assetsRef,
      snapshot => {
        const list = snapshot.docs.map(docSnap => docSnap.data() as PhysicalObject);
        // Deterministic stable in-memory sort by registration date
        list.sort((a, b) => new Date(b.registeredAt || 0).getTime() - new Date(a.registeredAt || 0).getTime());
        onUpdate(list);
      },
      error => {
        console.warn('Firestore asset subscription warning:', error);
      }
    );
  },

  // Get a single asset by ID
  async getAsset(id: string): Promise<PhysicalObject | null> {
    try {
      const snap = await getDoc(doc(db, ASSETS_COLLECTION, id));
      if (snap.exists()) {
        return snap.data() as PhysicalObject;
      }
      return null;
    } catch {
      return null;
    }
  },

  // Get all assets
  async getAllAssets(): Promise<PhysicalObject[]> {
    try {
      const snap = await getDocs(collection(db, ASSETS_COLLECTION));
      return snap.docs.map(docSnap => docSnap.data() as PhysicalObject);
    } catch {
      return [];
    }
  },

  // Create an asset in Firestore
  async createAsset(asset: PhysicalObject): Promise<void> {
    const assetRef = doc(db, ASSETS_COLLECTION, asset.id);
    await setDoc(assetRef, {
      ...asset,
      createdAt: asset.registeredAt || new Date().toISOString(),
      updatedAt: asset.registeredAt || new Date().toISOString(),
    });

    // Also persist initial timeline event to subcollection
    if (asset.timeline && asset.timeline.length > 0) {
      for (const evt of asset.timeline) {
        await eventService.addEvent(asset.id, evt);
      }
    }
  },

  // Update asset fields
  async updateAsset(id: string, updates: Partial<PhysicalObject>): Promise<void> {
    const assetRef = doc(db, ASSETS_COLLECTION, id);
    await updateDoc(assetRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  },

  // Delete/Archive asset
  async deleteAsset(id: string): Promise<void> {
    await deleteDoc(doc(db, ASSETS_COLLECTION, id));
  },

  // Seed or sync default items to Firestore (checks existingIds to prevent duplicates)
  async seedInitialAssetsIfEmpty(initialObjects: PhysicalObject[]): Promise<boolean> {
    try {
      const snap = await getDocs(collection(db, ASSETS_COLLECTION));
      const existingIds = new Set(snap.docs.map(d => d.id));

      let addedCount = 0;
      for (const obj of initialObjects) {
        if (!existingIds.has(obj.id)) {
          const assetRef = doc(db, ASSETS_COLLECTION, obj.id);
          await setDoc(assetRef, {
            ...obj,
            createdAt: obj.registeredAt || new Date().toISOString(),
            updatedAt: obj.registeredAt || new Date().toISOString(),
          });

          // Also persist timeline subcollection events
          if (obj.timeline && obj.timeline.length > 0) {
            for (const evt of obj.timeline) {
              await eventService.addEvent(obj.id, evt);
            }
          }
          addedCount++;
        }
      }
      return addedCount > 0;
    } catch (err) {
      console.warn('Could not sync initial assets to Firestore:', err);
      return false;
    }
  },
};
