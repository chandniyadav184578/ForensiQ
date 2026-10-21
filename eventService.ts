import {
  collection,
  doc,
  getDocs,
  setDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { TimelineEvent } from '../types/orbit';

export const eventService = {
  // Add an event to an asset's subcollection
  async addEvent(assetId: string, event: TimelineEvent): Promise<void> {
    const eventRef = doc(db, 'assets', assetId, 'events', event.id);
    await setDoc(eventRef, {
      ...event,
      createdAt: new Date().toISOString(),
    });
  },

  // Get all events for an asset ordered chronologically
  async getEvents(assetId: string): Promise<TimelineEvent[]> {
    try {
      const eventsRef = collection(db, 'assets', assetId, 'events');
      const q = query(eventsRef, orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => d.data() as TimelineEvent);
    } catch {
      return [];
    }
  },
};
