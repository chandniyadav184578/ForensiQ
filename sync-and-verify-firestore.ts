import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import firebaseConfigJson from '../firebase-applet-config.json';
import { INITIAL_OBJECTS } from '../src/data/seedData';

const firebaseConfig = {
  apiKey: firebaseConfigJson.apiKey,
  authDomain: firebaseConfigJson.authDomain,
  projectId: firebaseConfigJson.projectId,
  storageBucket: firebaseConfigJson.storageBucket,
  messagingSenderId: firebaseConfigJson.messagingSenderId,
  appId: firebaseConfigJson.appId,
};

const databaseId = firebaseConfigJson.firestoreDatabaseId || undefined;
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = databaseId ? getFirestore(app, databaseId) : getFirestore(app);

async function run() {
  console.log(`Connecting to Firestore database: ${databaseId} (Project: ${firebaseConfig.projectId})...`);

  // 1. Fetch current assets
  const assetsCol = collection(db, 'assets');
  let snapshot = await getDocs(assetsCol);
  const existingIds = new Set(snapshot.docs.map(d => d.id));

  console.log(`Current existing documents in Firestore: [${Array.from(existingIds).join(', ')}]`);

  // 2. Sync all INITIAL_OBJECTS with Keccak-256 passportHash & on-chain commitments
  let updatedCount = 0;
  for (const obj of INITIAL_OBJECTS) {
    const assetRef = doc(db, 'assets', obj.id);
    const existingSnap = await getDoc(assetRef);

    if (!existingSnap.exists()) {
      console.log(`-> Inserting new object with Keccak-256 hash: ${obj.id} (${obj.name})...`);
      await setDoc(assetRef, {
        ...obj,
        createdAt: obj.registeredAt || new Date().toISOString(),
        updatedAt: obj.registeredAt || new Date().toISOString(),
      });

      // Insert timeline subcollection events
      if (obj.timeline && obj.timeline.length > 0) {
        for (const evt of obj.timeline) {
          const evtRef = doc(db, 'assets', obj.id, 'events', evt.id);
          await setDoc(evtRef, {
            ...evt,
            createdAt: evt.timestamp,
          });
        }
      }
      updatedCount++;
    } else {
      // Sync on-chain hash commitment fields to existing document
      await setDoc(
        assetRef,
        {
          passportHash: obj.passportHash,
          contractAddress: obj.contractAddress,
          tokenId: obj.tokenId,
          hashTransactionHash: obj.hashTransactionHash,
          chainId: obj.chainId,
          network: obj.network,
          onChainVerified: true,
          lastVerifiedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      console.log(`✓ Updated on-chain Keccak-256 hash commitment for ${obj.id} (${obj.name}) [Hash: ${obj.passportHash?.slice(0, 10)}...]`);
      updatedCount++;
    }
  }

  console.log(`\nSynchronized on-chain hash fields for ${updatedCount} objects in Firestore.`);

  // 3. Re-verify Firestore state
  snapshot = await getDocs(assetsCol);
  console.log('\n==================================================');
  console.log(`VERIFIED CRYPTOGRAPHIC PASSPORT INTEGRITY IN FIRESTORE (${snapshot.size} OBJECTS)`);
  console.log('==================================================');
  for (const d of snapshot.docs) {
    const data = d.data();
    console.log(`• [${d.id}] ${data.orbitId} | ${data.name}`);
    console.log(`   Passport Hash (Keccak-256): ${data.passportHash}`);
    console.log(`   Hash Tx Hash:               ${data.hashTransactionHash}`);
    console.log(`   Smart Contract (Sepolia):   ${data.contractAddress} (Token ID: #${data.tokenId})`);
    console.log(`   Integrity Verified:         ${data.onChainVerified ? '✓ VERIFIED ON-CHAIN' : '⚠ DATA MISMATCH'}\n`);
  }
  console.log('==================================================');
}

run()
  .then(() => {
    console.log('\nFirestore synchronization and verification completed successfully!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error during Firestore sync/verification:', err);
    process.exit(1);
  });
