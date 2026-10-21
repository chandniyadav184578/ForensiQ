import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  walletAddress?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const authService = {
  // Sign in with Firebase Auth
  async login(emailOrUsername: string, password: string): Promise<FirebaseUser> {
    let email = emailOrUsername.trim();
    // Normalize aliases to real email for Firebase Auth
    if (email.toLowerCase() === 'gaurika' || email.toLowerCase() === 'gaurika dhamija') {
      email = 'gaurika.dhamija@orbit.io';
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // Ensure profile exists in Firestore
      await this.ensureUserProfile(userCredential.user);
      return userCredential.user;
    } catch (error: any) {
      // If user doesn't exist yet and it's the default authorized user, auto-register them in Firebase!
      if (
        (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') &&
        (email === 'gaurika.dhamija@orbit.io' || email === 'dhamijagaurika92@gmail.com')
      ) {
        try {
          const newCredential = await createUserWithEmailAndPassword(auth, email, password);
          await updateProfile(newCredential.user, {
            displayName: 'Marissa Yung',
            photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
          });
          await setDoc(doc(db, 'users', newCredential.user.uid), {
            uid: newCredential.user.uid,
            displayName: 'Marissa Yung',
            email,
            photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
            walletAddress: '0x8b37A094f31cE84C078170D4d6a45749EFA5E61B',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          return newCredential.user;
        } catch (createErr) {
          throw error;
        }
      }
      throw error;
    }
  },

  // Register a new user
  async register(email: string, password: string, displayName: string, walletAddress?: string): Promise<FirebaseUser> {
    const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
    const user = userCredential.user;

    const photoURL = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80';

    await updateProfile(user, {
      displayName: displayName.trim(),
      photoURL,
    });

    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      displayName: displayName.trim(),
      email: email.trim(),
      photoURL,
      walletAddress: walletAddress || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return user;
  },

  // Sign out
  async logout(): Promise<void> {
    await signOut(auth);
  },

  // Ensure user profile in Firestore
  async ensureUserProfile(user: FirebaseUser): Promise<void> {
    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        displayName: user.displayName || user.email?.split('@')[0] || 'ORBIT Custodian',
        email: user.email || '',
        photoURL: user.photoURL || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  },

  // Listen to Auth State
  onAuthChange(callback: (user: FirebaseUser | null) => void) {
    return onAuthStateChanged(auth, callback);
  },

  // Fetch Firestore Profile
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        return snap.data() as UserProfile;
      }
      return null;
    } catch {
      return null;
    }
  },
};
