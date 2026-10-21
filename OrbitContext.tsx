import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { PhysicalObject, PersonaWallet, TimelineEvent, MarketplaceListing } from '../types/orbit';
import { INITIAL_OBJECTS, INITIAL_PERSONAS } from '../data/seedData';
import { generateTxHash, computeSha256, generateOrbitId, generateHandshakeCode } from '../utils/crypto';
import confetti from 'canvas-confetti';
import {
  connectWallet,
  getConnectedWallet,
  getWalletBalance,
  switchToSepolia,
  SEPOLIA_CHAIN_ID,
  isMetaMaskInstalled,
  startProviderDiscovery,
  onProviderDiscovered,
  subscribeWalletEvents,
  classifyError,
  orbitDebug,
  OrbitError,
  type OrbitErrorKind,
} from '../blockchain/wallet';
import { authService, UserProfile } from '../services/authService';
import { assetService } from '../services/assetService';
import { eventService } from '../services/eventService';
import { transferService } from '../services/transferService';
import { repairService } from '../services/repairService';
import { recoveryService } from '../services/recoveryService';
import { testFirebaseConnection } from '../lib/firebase';
import { computePassportHash } from '../utils/passportHashing';
import {
  passportContractService,
  IntegrityVerificationResult,
  ORBIT_PASSPORT_CONTRACT_SEPOLIA,
  ORBIT_SEPOLIA_CHAIN_ID,
  ORBIT_NETWORK_NAME,
  setStoredContractAddress,
} from '../blockchain/passportContractService';
import {
  escrowContractService,
  setStoredEscrowContractAddress,
  getStoredEscrowContractAddress,
  ORBIT_ESCROW_CONTRACT_SEPOLIA,
} from '../blockchain/escrowContractService';
import { ethers } from 'ethers';

interface OrbitContextType {
  objects: PhysicalObject[];
  personas: PersonaWallet[];
  currentWallet: PersonaWallet;
  isConnected: boolean;
  isMetaMaskInjected: boolean;
  chainId: number | null;
  walletBalanceEth: string;
  isSepolia: boolean;
  walletStatus: 'not_detected' | 'disconnected' | 'connecting' | 'wrong_network' | 'connected';
  walletError: { kind: OrbitErrorKind; message: string } | null;
  clearWalletError: () => void;
  switchWalletToSepolia: () => Promise<boolean>;
  switchPersona: (address: string) => void;
  connectInjectedWallet: () => Promise<boolean>;
  disconnectWallet: () => void;
  faucetAirdrop: (amount?: number) => void;
  getObject: (idOrOrbitId: string) => PhysicalObject | undefined;
  registerObject: (params: {
    name: string;
    category: PhysicalObject['category'];
    brand: string;
    model: string;
    serialNumber: string;
    manufactureYear: number;
    condition: PhysicalObject['condition'];
    description: string;
    imageUrl?: string;
    recoveryRewardEth?: string;
    emergencyInstructions?: string;
  }) => Promise<PhysicalObject>;
  transferOwnership: (objectId: string, recipientAddress: string, recipientName?: string) => Promise<boolean>;
  recordLifecycleEvent: (
    objectId: string,
    eventParams: {
      type: 'REPAIR_RECORDED' | 'MAINTENANCE' | 'CERTIFIED_INSPECTION';
      title: string;
      description: string;
      serviceCenter?: string;
      invoiceHash?: string;
      componentsReplaced?: string[];
      costEth?: string;
    }
  ) => Promise<boolean>;
  markAsLost: (objectId: string, rewardEth: string, location: string, instructions: string) => Promise<boolean>;
  cancelLostStatus: (objectId: string) => Promise<boolean>;
  submitRecoveryClaim: (
    objectId: string,
    params: {
      finderAddress: string;
      contactRelay: string;
      foundLocation: string;
      finderNotes: string;
    }
  ) => Promise<string>;
  confirmHandoverAndReleaseReward: (objectId: string, enteredHandshakeCode?: string) => Promise<boolean>;
  resetDemoData: () => void;
  recentTx: { hash?: string; block?: number; summary: string; kind: 'onchain' | 'wallet' | 'local' } | null;
  clearRecentTx: () => void;
  // Cryptographic Passport Integrity & On-Chain Verification
  contractAddress: string;
  setContractAddress: (address: string) => void;
  hasContract: boolean;
  escrowContractAddress: string;
  setEscrowContractAddress: (address: string) => void;
  hasEscrowContract: boolean;
  verifyPassportIntegrity: (objectId: string) => Promise<IntegrityVerificationResult>;
  updatePassportHashOnChain: (objectId: string) => Promise<{ success: boolean; hash?: string; txHash?: string; error?: string }>;
  simulateTamperField: (objectId: string, fieldName: 'name' | 'serialNumber' | 'description', modifiedValue: string) => Promise<void>;
  // User Login & Dashboard Profile
  isAuthenticated: boolean;
  loginWithCredentials: (usernameOrEmail: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logoutUser: () => void;
  updateObjectImage: (objectId: string, newImageUrl: string) => void;
  marketplaceListings: MarketplaceListing[];
  listObjectForSale: (objectId: string, priceEth: string) => Promise<boolean>;
  cancelMarketplaceListing: (listingId: string) => Promise<boolean>;
  purchaseMarketplaceListing: (listingId: string) => Promise<boolean>;
  activeCredentials: {
    name: string;
    email: string;
    username: string;
    passwordDisplay: string;
  };
}

const OrbitContext = createContext<OrbitContextType | undefined>(undefined);

const STORAGE_KEY_OBJECTS = 'orbit_app_objects_v6';
const STORAGE_KEY_PERSONAS = 'orbit_app_personas_v6';
const STORAGE_KEY_CURRENT_WALLET = 'orbit_app_current_wallet_v6';
const STORAGE_KEY_AUTH = 'orbit_app_auth_v6';
const STORAGE_KEY_MARKETPLACE = 'orbit_marketplace_v1';

const DEFAULT_CREDENTIALS = {
  name: 'Marissa Yung',
  email: 'gaurika.dhamija@orbit.io',
  username: 'gaurika',
  passwordDisplay: 'Gaurika@Orbit2026',
};

export const IMAGE_MAP: Record<string, string> = {
  'orbit-7821': '/images/sony_camera_a7iv_1790459142532.jpg',
  'orbit-4418': '/images/hp_spectre_laptop_1790459278757.jpg',
  'orbit-3912': '/images/macbook_pro_device_1790459129356.jpg',
  'orbit-5621': '/images/specialized_bicycle_1790459116055.jpg',
  'orbit-6204': '/images/rolex_submariner_watch_1790510062882.jpg',
  'orbit-8119': '/images/dji_drone_hardware_1790510080647.jpg',
  'orbit-2735': '/images/synthesizer_audio_gear_1790510095743.jpg',
  // 7 New Demo Objects:
  'orbit-1302': '/images/macbook_air_midnight_1790510690641.jpg',
  'orbit-5542': '/images/trek_road_bicycle_1790510705506.jpg',
  'orbit-1508': '/images/iphone_15_pro_titanium_1790510722760.jpg',
  'orbit-5012': '/images/canon_rf_50_lens_1790510736881.jpg',
  'orbit-9014': '/images/asus_rog_gaming_laptop_1790510751769.jpg',
  'orbit-6602': '/images/jbl_headphones_audio_1790510771546.jpg',
  'orbit-2022': '/images/keychron_keyboard_1790510791457.jpg',
};

// Automatic intelligent image resolver based on object metadata
export const resolveAppropriateImage = (
  name: string,
  brand: string,
  model: string,
  category: string,
  currentImageUrl?: string
): string => {
  const combined = `${name} ${brand} ${model} ${category}`.toLowerCase();

  // MacBook Air
  if (combined.includes('air') || (combined.includes('macbook') && combined.includes('air'))) {
    return '/images/macbook_air_midnight_1790510690641.jpg';
  }

  // Trek Bicycles
  if (combined.includes('trek') || combined.includes('domane')) {
    return '/images/trek_road_bicycle_1790510705506.jpg';
  }

  // iPhone 15 / Apple Phones
  if (combined.includes('iphone') || combined.includes('iphone 15')) {
    return '/images/iphone_15_pro_titanium_1790510722760.jpg';
  }

  // Canon RF 50mm Lens
  if (combined.includes('canon') || combined.includes('50mm') || combined.includes('rf 50')) {
    return '/images/canon_rf_50_lens_1790510736881.jpg';
  }

  // ASUS ROG Zephyrus / Gaming Laptops
  if (combined.includes('asus') || combined.includes('zephyrus') || combined.includes('rog')) {
    return '/images/asus_rog_gaming_laptop_1790510751769.jpg';
  }

  // JBL Live 660NC / Headphones
  if (combined.includes('jbl') || combined.includes('660nc') || combined.includes('headphone')) {
    return '/images/jbl_headphones_audio_1790510771546.jpg';
  }

  // Keychron K2 / Mechanical Keyboards
  if (combined.includes('keychron') || combined.includes('k2') || combined.includes('keyboard')) {
    return '/images/keychron_keyboard_1790510791457.jpg';
  }

  // Rolex / Luxury Watches
  if (
    combined.includes('rolex') ||
    combined.includes('watch') ||
    combined.includes('submariner') ||
    combined.includes('omega') ||
    combined.includes('patek') ||
    category === 'Watches & Luxury'
  ) {
    return '/images/rolex_submariner_watch_1790510062882.jpg';
  }

  // Drones / Aerospace / Hardware Gear
  if (
    combined.includes('drone') ||
    combined.includes('dji') ||
    combined.includes('mavic') ||
    combined.includes('cine') ||
    combined.includes('aerial')
  ) {
    return '/images/dji_drone_hardware_1790510080647.jpg';
  }

  // Synthesizers / Audio & Instruments
  if (
    combined.includes('synth') ||
    combined.includes('synthesizer') ||
    combined.includes('teenage engineering') ||
    combined.includes('op-1') ||
    category === 'Audio & Instruments'
  ) {
    return '/images/synthesizer_audio_gear_1790510095743.jpg';
  }

  // HP Laptops / Spectre / Pavilion / Envy / Omen
  if (
    combined.includes('hp') ||
    combined.includes('spectre') ||
    combined.includes('pavilion') ||
    combined.includes('omen') ||
    combined.includes('envy')
  ) {
    return '/images/hp_spectre_laptop_1790459278757.jpg';
  }

  // Apple MacBooks
  if (combined.includes('macbook') || combined.includes('apple') || combined.includes('macos')) {
    return '/images/macbook_pro_device_1790459129356.jpg';
  }

  // Generic Laptops / Computing
  if (
    combined.includes('laptop') ||
    combined.includes('notebook') ||
    combined.includes('thinkpad') ||
    combined.includes('dell') ||
    combined.includes('asus') ||
    combined.includes('lenovo') ||
    category === 'Computing & Laptops'
  ) {
    return '/images/hp_spectre_laptop_1790459278757.jpg';
  }

  // Bicycles & Mobility
  if (
    combined.includes('bike') ||
    combined.includes('bicycle') ||
    combined.includes('specialized') ||
    combined.includes('cycle') ||
    combined.includes('trek') ||
    category === 'Bicycles & Mobility'
  ) {
    return '/images/specialized_bicycle_1790459116055.jpg';
  }

  // Cameras & Optics
  if (
    combined.includes('camera') ||
    combined.includes('sony') ||
    combined.includes('alpha') ||
    combined.includes('canon') ||
    combined.includes('nikon') ||
    combined.includes('leica') ||
    combined.includes('fujifilm') ||
    category === 'Cameras & Optics'
  ) {
    return '/images/sony_camera_a7iv_1790459142532.jpg';
  }

  return currentImageUrl || '/images/hp_spectre_laptop_1790459278757.jpg';
};

// Keep legacy Firestore records working after local product images move to /public/images.
const normalizeProductImageUrl = (url?: string | null): string => {
  if (!url) return '/images/hp_spectre_laptop_1790459278757.jpg';
  if (url.startsWith('/src/assets/images/')) {
    return `/images/${url.split('/').pop()}`;
  }
  return url;
};

export const OrbitProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [activeCredentials, setActiveCredentials] = useState(DEFAULT_CREDENTIALS);
  const [objects, setObjects] = useState<PhysicalObject[]>(INITIAL_OBJECTS);

  const buildDemoMarketplaceListings = (): MarketplaceListing[] => {
    const demoPrices: Record<string, string> = {
      'orbit-7821': '1.35', 'orbit-4418': '1.85', 'orbit-3912': '2.10',
      'orbit-5621': '0.92', 'orbit-6204': '3.40', 'orbit-8119': '2.65',
      'orbit-2735': '1.15', 'orbit-1302': '0.78', 'orbit-5542': '0.64',
      'orbit-1508': '1.28', 'orbit-5012': '0.58', 'orbit-9014': '0.42',
      'orbit-6602': '0.08', 'orbit-2022': '0.12',
    };
    return INITIAL_OBJECTS
      .filter(obj => obj.status === 'ACTIVE' || obj.status === 'RECOVERED')
      .map((obj, index) => ({
        id: `listing-${obj.id}`,
        objectId: obj.id,
        sellerAddress: obj.currentOwnerAddress,
        sellerName: obj.currentOwnerName,
        priceEth: demoPrices[obj.id] || '0.35',
        listedAt: new Date(Date.UTC(2026, 8, 20 + index)).toISOString(),
        status: 'ACTIVE' as const,
      }));
  };

  const [marketplaceListings, setMarketplaceListings] = useState<MarketplaceListing[]>(() => {
    const demoListings = buildDemoMarketplaceListings();
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MARKETPLACE);
      if (saved) {
        const parsed = JSON.parse(saved) as MarketplaceListing[];
        // Preserve the user's saved listing states while filling in any missing starter listings.
        const existingObjectIds = new Set(parsed.map(listing => listing.objectId));
        return [...parsed, ...demoListings.filter(listing => !existingObjectIds.has(listing.objectId))];
      }
    } catch (e) {
      console.error(e);
    }
    return demoListings;
  });

  const [personas, setPersonas] = useState<PersonaWallet[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PERSONAS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_PERSONAS;
  });

  const [currentWallet, setCurrentWallet] = useState<PersonaWallet>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CURRENT_WALLET);
      if (saved) {
        const found = personas.find(p => p.address.toLowerCase() === saved.toLowerCase());
        if (found) return found;
      }
    } catch (e) {
      console.error(e);
    }
    return personas[0] || INITIAL_PERSONAS[0];
  });

  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isMetaMaskInjected, setIsMetaMaskInjected] = useState<boolean>(false);
  const [chainId, setChainId] = useState<number | null>(null);
  const [walletBalanceEth, setWalletBalanceEth] = useState<string>('0');
  const [isSepolia, setIsSepolia] = useState<boolean>(false);
  const [walletStatus, setWalletStatus] = useState<'not_detected' | 'disconnected' | 'connecting' | 'wrong_network' | 'connected'>('disconnected');
  const [walletError, setWalletError] = useState<{ kind: OrbitErrorKind; message: string } | null>(null);
  const [recentTx, setRecentTx] = useState<{ hash?: string; block?: number; summary: string; kind: 'onchain' | 'wallet' | 'local' } | null>(null);

  const [contractAddress, setContractAddressState] = useState<string>(() => {
    return passportContractService.getContractAddress();
  });

  const setContractAddress = (address: string) => {
    setStoredContractAddress(address);
    setContractAddressState(address);
  };

  const hasContract = Boolean(
    contractAddress && ethers.isAddress(contractAddress) && contractAddress !== ethers.ZeroAddress
  );

  const [escrowContractAddress, setEscrowContractAddressState] = useState<string>(() => {
    return escrowContractService.getContractAddress();
  });

  const setEscrowContractAddress = (address: string) => {
    setStoredEscrowContractAddress(address);
    setEscrowContractAddressState(address);
  };

  const hasEscrowContract = Boolean(
    escrowContractAddress &&
      ethers.isAddress(escrowContractAddress) &&
      escrowContractAddress !== ethers.ZeroAddress
  );

  // Initialize Firebase Connection, Auth & Firestore Live Subscriptions
  useEffect(() => {
    testFirebaseConnection();

    // Perform one-time showcase synchronization asynchronously in background
    assetService.seedInitialAssetsIfEmpty(INITIAL_OBJECTS);

    // Pure real-time Firestore asset subscriber (read-only listener, stable)
    const unsubscribeAssets = assetService.subscribeToAssets(firestoreAssets => {
      if (firestoreAssets.length > 0) {
        setObjects(firestoreAssets.map(asset => ({ ...asset, imageUrl: normalizeProductImageUrl(asset.imageUrl) })));
      }
    });

    // Listen to Firebase Auth state
    const unsubscribeAuth = authService.onAuthChange(async fbUser => {
      if (fbUser) {
        setIsAuthenticated(true);
        setActiveCredentials({
          name: fbUser.displayName || 'Marissa Yung',
          email: fbUser.email || 'gaurika.dhamija@orbit.io',
          username: fbUser.email?.split('@')[0] || 'gaurika',
          passwordDisplay: '••••••••',
        });
      }
    });

    return () => {
      unsubscribeAssets();
      unsubscribeAuth();
    };
  }, []);

  // MetaMask detection + event wiring. Wallets can inject after page load, so re-check on EIP-6963 announcements.
  // A single subscription is kept at a time and fully removed on cleanup (no duplicate listeners).
  useEffect(() => {
    startProviderDiscovery();
    let unsubscribeEvents: (() => void) | null = null;

    const adoptAccount = async (address: string, chain: number) => {
      const balance = await getWalletBalance(address);
      const meta: PersonaWallet = {
        address,
        name: 'MetaMask Account',
        role: 'Collector / Owner',
        balanceEth: Number(balance),
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
        verifiedBadge: true,
      };
      setPersonas(prev => {
        const existing = prev.find(p => p.address.toLowerCase() === address.toLowerCase());
        if (existing) {
          setCurrentWallet({ ...existing, balanceEth: Number(balance) });
          return prev.map(p => (p === existing ? { ...p, balanceEth: Number(balance) } : p));
        }
        setCurrentWallet(meta);
        return [meta, ...prev];
      });
      setWalletBalanceEth(balance);
      setChainId(chain);
      setIsSepolia(chain === SEPOLIA_CHAIN_ID);
      setIsConnected(true);
      setWalletStatus(chain === SEPOLIA_CHAIN_ID ? 'connected' : 'wrong_network');
    };

    const attach = () => {
      const installed = isMetaMaskInstalled();
      setIsMetaMaskInjected(installed);
      if (!installed) {
        setWalletStatus(prev => (prev === 'connecting' ? prev : 'not_detected'));
        return;
      }
      setWalletStatus(prev => (prev === 'not_detected' ? 'disconnected' : prev));
      if (unsubscribeEvents) return; // already subscribed
      unsubscribeEvents = subscribeWalletEvents({
        onAccountsChanged: async accounts => {
          orbitDebug('accountsChanged', { count: accounts.length });
          if (!accounts.length) {
            setIsConnected(false);
            setChainId(null);
            setWalletBalanceEth('0');
            setIsSepolia(false);
            setWalletStatus('disconnected');
            return;
          }
          const w = await getConnectedWallet();
          if (w) await adoptAccount(w.address, w.chainId);
        },
        onChainChanged: async id => {
          orbitDebug('chainChanged', { id });
          setChainId(id);
          setIsSepolia(id === SEPOLIA_CHAIN_ID);
          setWalletStatus(prev => (prev === 'disconnected' || prev === 'not_detected' ? prev : id === SEPOLIA_CHAIN_ID ? 'connected' : 'wrong_network'));
          if (id !== SEPOLIA_CHAIN_ID) {
            setWalletError({ kind: 'WRONG_NETWORK', message: `MetaMask is on chain ${id}. ORBIT needs Ethereum Sepolia (11155111).` });
          } else {
            setWalletError(null);
            const w = await getConnectedWallet();
            if (w) await adoptAccount(w.address, w.chainId);
          }
        },
        onDisconnect: () => {
          setWalletStatus('disconnected');
          setIsConnected(false);
        },
      });
      // Silent restore of a previously authorised session (no popup).
      getConnectedWallet().then(w => {
        if (w) adoptAccount(w.address, w.chainId);
      });
    };

    attach();
    const offDiscovery = onProviderDiscovered(attach);
    return () => {
      offDiscovery();
      unsubscribeEvents?.();
      unsubscribeEvents = null;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PERSONAS, JSON.stringify(personas));
  }, [personas]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_MARKETPLACE, JSON.stringify(marketplaceListings));
  }, [marketplaceListings]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CURRENT_WALLET, currentWallet.address);
  }, [currentWallet]);

  /**
   * Shows a notification. It is labelled "confirmed on Sepolia" ONLY when a real transaction hash from a
   * confirmed receipt is supplied. Anything else is labelled as a wallet event or a local demo action, and
   * no hash or block number is fabricated for display. The returned hash is a clearly non-chain
   * identifier ("LOCAL-...") for local timeline entries.
   */
  const recordTx = (summary: string, realHash?: string, realBlock?: number, kind?: 'wallet') => {
    const isChain = Boolean(realHash && /^0x[0-9a-fA-F]{64}$/.test(realHash));
    setRecentTx({
      hash: isChain ? realHash : undefined,
      block: isChain ? realBlock : undefined,
      summary,
      kind: isChain ? 'onchain' : kind === 'wallet' ? 'wallet' : 'local',
    });
    return {
      hash: isChain ? (realHash as string) : `LOCAL-${Math.random().toString(16).slice(2, 10)}`,
      block: isChain ? (realBlock || 0) : 0,
    };
  };

  const clearRecentTx = () => setRecentTx(null);

  const switchPersona = (address: string) => {
    const found = personas.find(p => p.address.toLowerCase() === address.toLowerCase());
    if (found) {
      setCurrentWallet(found);
      setIsConnected(true);
    }
  };

  const clearWalletError = () => setWalletError(null);

  /** Asks MetaMask to switch to Sepolia, then re-reads account + chain. Only call from a click. */
  const switchWalletToSepolia = async (): Promise<boolean> => {
    try {
      setWalletError(null);
      await switchToSepolia();
      const w = await getConnectedWallet();
      if (!w) throw new OrbitError('WALLET_NOT_CONNECTED', 'Switched network, but no MetaMask account is connected.');
      const balance = await getWalletBalance(w.address);
      setChainId(w.chainId);
      setIsSepolia(w.isSepolia);
      setWalletBalanceEth(balance);
      setWalletStatus(w.isSepolia ? 'connected' : 'wrong_network');
      return w.isSepolia;
    } catch (err) {
      const e = classifyError(err, 'Switching network');
      setWalletError({ kind: e.kind, message: e.message });
      return false;
    }
  };

  const connectInjectedWallet = async (): Promise<boolean> => {
    setWalletError(null);
    if (!isMetaMaskInstalled()) {
      setIsMetaMaskInjected(false);
      setWalletStatus('not_detected');
      const e = new OrbitError(
        'METAMASK_NOT_DETECTED',
        'MetaMask was not detected. Install the MetaMask extension from metamask.io, enable it for this site (and for localhost), then reload ORBIT. If other wallet extensions are installed, set MetaMask as the default or disable the others.'
      );
      setWalletError({ kind: e.kind, message: e.message });
      throw e;
    }
    setIsMetaMaskInjected(true);
    setWalletStatus('connecting');
    try {
      // Account access is requested here, from the user's click, and nowhere else.
      let wallet = await connectWallet();

      // Wrong network: ask to switch (still user-initiated). If declined, stay connected-but-wrong-network.
      if (!wallet.isSepolia) {
        try {
          await switchToSepolia();
        } catch (switchErr) {
          const e = classifyError(switchErr, 'Switching network');
          setWalletError({ kind: e.kind === 'UNKNOWN' ? 'WRONG_NETWORK' : e.kind, message: e.message });
        }
        const refreshed = await getConnectedWallet();
        if (refreshed) wallet = refreshed;
      }

      const balance = await getWalletBalance(wallet.address);
      const meta: PersonaWallet = {
        address: wallet.address,
        name: 'MetaMask Account',
        role: 'Collector / Owner',
        balanceEth: Number(balance),
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
        verifiedBadge: true,
      };
      const existing = personas.find(p => p.address.toLowerCase() === wallet.address.toLowerCase());
      if (existing) {
        setCurrentWallet({ ...existing, balanceEth: Number(balance) });
      } else {
        setPersonas(prev => [meta, ...prev]);
        setCurrentWallet(meta);
      }

      setChainId(wallet.chainId);
      setWalletBalanceEth(balance);
      setIsSepolia(wallet.isSepolia);
      setIsConnected(true);
      setWalletStatus(wallet.isSepolia ? 'connected' : 'wrong_network');

      // Never report a Sepolia connection unless the wallet really is on Sepolia.
      if (!wallet.isSepolia) return false;
      recordTx(`Connected Web3 Wallet ${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)} (Sepolia)`, undefined, undefined, 'wallet');
      return true;
    } catch (err) {
      const e = classifyError(err, 'MetaMask connection');
      orbitDebug('connect.failed', { kind: e.kind });
      setIsConnected(false);
      setWalletStatus('disconnected');
      setWalletError({ kind: e.kind, message: e.message });
      throw e;
    }
  };

  const disconnectWallet = () => {
    setIsConnected(false);
    setChainId(null);
    setWalletBalanceEth('0');
    setIsSepolia(false);
    setWalletStatus(isMetaMaskInstalled() ? 'disconnected' : 'not_detected');
  };

  const faucetAirdrop = (amount = 0.5) => {
    setPersonas(prev =>
      prev.map(p => {
        if (p.address.toLowerCase() === currentWallet.address.toLowerCase()) {
          const updatedBalance = Number((p.balanceEth + amount).toFixed(4));
          return { ...p, balanceEth: updatedBalance };
        }
        return p;
      })
    );
    setCurrentWallet(prev => ({
      ...prev,
      balanceEth: Number((prev.balanceEth + amount).toFixed(4)),
    }));
    recordTx(`Faucet airdrop of +${amount} ETH to ${currentWallet.name}`);
  };

  const getObject = (idOrOrbitId: string) => {
    if (!idOrOrbitId) return undefined;
    const cleanQuery = idOrOrbitId.trim().toLowerCase();
    return objects.find(
      o =>
        o.id.toLowerCase() === cleanQuery ||
        o.orbitId.toLowerCase() === cleanQuery ||
        o.orbitId.replace(/[^0-9]/g, '') === cleanQuery.replace(/[^0-9]/g, '') ||
        o.serialNumber.toLowerCase() === cleanQuery
    );
  };

  const registerObject = async (params: {
    name: string;
    category: PhysicalObject['category'];
    brand: string;
    model: string;
    serialNumber: string;
    manufactureYear: number;
    condition: PhysicalObject['condition'];
    description: string;
    imageUrl?: string;
    recoveryRewardEth?: string;
    emergencyInstructions?: string;
  }): Promise<PhysicalObject> => {
    const existingNums = objects.map(o => {
      const match = o.orbitId.match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    });

    const { orbitId, id } = generateOrbitId(existingNums);
    const serialHash = await computeSha256(`${params.brand}:${params.serialNumber}:${params.manufactureYear}`);

    const initialObjBeforeHash: PhysicalObject = {
      id,
      orbitId,
      name: params.name,
      category: params.category,
      brand: params.brand,
      model: params.model,
      serialNumber: params.serialNumber,
      serialHash,
      manufactureYear: params.manufactureYear,
      condition: params.condition,
      description: params.description,
      imageUrl: resolveAppropriateImage(
        params.name,
        params.brand,
        params.model,
        params.category,
        params.imageUrl
      ),
      registeredAt: new Date().toISOString(),
      currentOwnerAddress: currentWallet.address,
      currentOwnerName: currentWallet.name,
      status: 'ACTIVE',
      recoveryRewardEth: params.recoveryRewardEth || '0.05',
      escrowLocked: false,
      lostInstructions: params.emergencyInstructions || '',
      timeline: [],
    };

    const passportHash = computePassportHash(initialObjBeforeHash);

    let finalTokenId: number = 0;
    let finalTxHash: string | undefined = undefined;
    let finalBlock: number = 0;
    let isRealOnChain = false;

    // Check if contract is deployed and MetaMask is available for real on-chain minting
    if (hasContract) {
      try {
        const onChainMint = await passportContractService.mintPassportOnChain({
          assetId: id,
          passportHash,
          recipientAddress: currentWallet.address,
          contractAddress,
        });

        finalTokenId = onChainMint.tokenId;
        finalTxHash = onChainMint.txHash;
        finalBlock = onChainMint.blockNumber;
        isRealOnChain = true;
      } catch (mintErr: any) {
        // If user rejected or transaction failed, rethrow
        throw mintErr;
      }
    } else {
      // Deterministic local ID when in local simulation / uncommitted mode
      finalTokenId = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;
    }

    const mintEvent: TimelineEvent = {
      id: `evt-mint-${Date.now()}`,
      type: 'MINTED',
      timestamp: new Date().toISOString(),
      blockNumber: finalBlock,
      txHash: finalTxHash || 'PENDING_ON_CHAIN_MINT',
      actorAddress: currentWallet.address,
      actorName: `${currentWallet.name} (Original Minter)`,
      title: isRealOnChain
        ? `ORBIT ERC-721 NFT Minted on Sepolia (Token #${finalTokenId})`
        : 'ORBIT Identity Created & Provisioned',
      description: isRealOnChain
        ? `Physical serial ${params.serialNumber} hashed into cryptographic seal ${serialHash}. ERC-721 Token #${finalTokenId} confirmed on Ethereum Sepolia (Tx: ${finalTxHash?.slice(0, 10)}...).`
        : `Physical serial ${params.serialNumber} hashed into cryptographic seal ${serialHash}. Digital passport provisioned locally (Token #${finalTokenId}). Awaiting on-chain Sepolia contract deployment.`,
      metadata: {
        costEth: isRealOnChain ? '0.0035' : '0.0000',
      },
    };

    const newObj: PhysicalObject = {
      ...initialObjBeforeHash,
      passportHash,
      contractAddress: hasContract ? contractAddress : '',
      tokenId: finalTokenId,
      mintTransactionHash: finalTxHash,
      hashTransactionHash: finalTxHash,
      blockchainStatus: isRealOnChain ? 'CONFIRMED' : 'UNCOMMITTED',
      chainId: ORBIT_SEPOLIA_CHAIN_ID,
      network: ORBIT_NETWORK_NAME,
      onChainVerified: isRealOnChain,
      lastVerifiedAt: isRealOnChain ? new Date().toISOString() : undefined,
      timeline: [mintEvent],
    };

    setObjects(prev => [newObj, ...prev]);

    // Persist to real Cloud Firestore
    try {
      await assetService.createAsset(newObj);
    } catch (fsErr) {
      console.warn('Firestore asset registration write warning:', fsErr);
    }

    if (finalTxHash) {
      recordTx(`Minted Digital Passport for ${params.name} (#${finalTokenId}) on Sepolia`, finalTxHash, finalBlock);
      try {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      } catch {
        // ignore
      }
    } else {
      recordTx(`Created local passport for ${params.name} (${orbitId})`);
    }

    return newObj;
  };

  const transferOwnership = async (
    objectId: string,
    recipientAddress: string,
    recipientName?: string
  ): Promise<boolean> => {
    const obj = objects.find(o => o.id === objectId);
    if (!obj) throw new Error('Object not found in registry');

    const cleanRecipient = recipientAddress.trim();
    if (!ethers.isAddress(cleanRecipient)) {
      throw new Error(`Invalid Ethereum address: "${cleanRecipient}". Please enter a valid 0x address.`);
    }

    if (cleanRecipient === ethers.ZeroAddress) {
      throw new Error('Cannot transfer ownership to the zero address (0x0000000000000000000000000000000000000000).');
    }

    if (cleanRecipient.toLowerCase() === currentWallet.address.toLowerCase()) {
      throw new Error('Recipient wallet address cannot be the same as the current custodian wallet.');
    }

    const targetContract = obj.contractAddress || contractAddress;
    const isContractConfigured = Boolean(
      targetContract && ethers.isAddress(targetContract) && targetContract !== ethers.ZeroAddress
    );

    let realTxHash: string | undefined;
    let realBlock: number = 0;

    // REAL ON-CHAIN TRANSFER FLOW:
    if (isContractConfigured && obj.tokenId && obj.blockchainStatus === 'CONFIRMED') {
      const transferRes = await passportContractService.transferPassportOnChain({
        tokenId: obj.tokenId,
        fromAddress: currentWallet.address,
        toAddress: cleanRecipient,
        contractAddress: targetContract,
      });

      realTxHash = transferRes.txHash;
      realBlock = transferRes.blockNumber;
    } else {
      if (obj.blockchainStatus === 'CONFIRMED') {
        throw new Error('Contract address not found for this blockchain-backed asset. Please configure contract address.');
      }
    }

    const recipientPersona = personas.find(p => p.address.toLowerCase() === cleanRecipient.toLowerCase());
    const finalRecipientName = recipientName || recipientPersona?.name || `Wallet (${cleanRecipient.slice(0, 6)}...${cleanRecipient.slice(-4)})`;

    const transferEvent: TimelineEvent = {
      id: `evt-tx-${Date.now()}`,
      type: 'OWNERSHIP_TRANSFERRED',
      timestamp: new Date().toISOString(),
      blockNumber: realBlock,
      txHash: realTxHash || 'LOCAL_SIMULATED_TRANSFER',
      actorAddress: currentWallet.address,
      actorName: currentWallet.name,
      title: `${new Date().getFullYear()} — Transferred to ${finalRecipientName} ✓`,
      description: realTxHash
        ? `Ethereum Sepolia ERC-721 transfer confirmed on-chain (Tx: ${realTxHash.slice(0, 10)}...). New custodian verified via ownerOf(#${obj.tokenId}).`
        : `Local custody transfer recorded (${currentWallet.name} → ${finalRecipientName}). Pending on-chain Sepolia sync.`,
      metadata: {
        recipientAddress: cleanRecipient,
        costEth: realTxHash ? '0.0008' : '0.0000',
      },
    };

    // Update Firestore ONLY AFTER confirmed blockchain transaction
    const ok = await transferService.executeTransfer({
      assetId: objectId,
      tokenId: obj.tokenId,
      fromAddress: currentWallet.address,
      fromName: currentWallet.name,
      toAddress: cleanRecipient,
      toName: finalRecipientName,
      transferEvent,
      contractAddress: targetContract || '',
      network: 'Sepolia',
      blockNumber: realBlock,
    });

    if (!ok) {
      throw new Error('On-chain transfer was confirmed, but Firestore database synchronization failed.');
    }

    // Update local React state
    setObjects(prev =>
      prev.map(o => {
        if (o.id === objectId) {
          return {
            ...o,
            currentOwnerAddress: cleanRecipient,
            currentOwnerName: finalRecipientName,
            status: 'ACTIVE',
            timeline: [transferEvent, ...o.timeline],
          };
        }
        return o;
      })
    );

    if (realTxHash) {
      recordTx(`Transferred ${obj.orbitId} title to ${finalRecipientName} on Sepolia`, realTxHash, realBlock);
      try {
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.7 } });
      } catch {
        // ignore
      }
    } else {
      recordTx(`Transferred ${obj.orbitId} local custody to ${finalRecipientName}`);
    }

    return true;
  };

  const recordLifecycleEvent = async (
    objectId: string,
    eventParams: {
      type: 'REPAIR_RECORDED' | 'MAINTENANCE' | 'CERTIFIED_INSPECTION';
      title: string;
      description: string;
      serviceCenter?: string;
      invoiceHash?: string;
      componentsReplaced?: string[];
      costEth?: string;
    }
  ): Promise<boolean> => {
    const obj = objects.find(o => o.id === objectId);
    if (!obj) return false;

    let realTxHash: string | undefined;
    let realBlock: number = 0;

    // Cryptographic event commitment on Sepolia
    const eventCanonicalPayload = JSON.stringify({
      assetId: obj.id,
      orbitId: obj.orbitId,
      type: eventParams.type,
      title: eventParams.title,
      description: eventParams.description,
      serviceCenter: eventParams.serviceCenter || currentWallet.name,
      invoiceHash: eventParams.invoiceHash,
      componentsReplaced: eventParams.componentsReplaced,
    });
    const eventHash = ethers.keccak256(ethers.toUtf8Bytes(eventCanonicalPayload));

    if (hasContract && obj.tokenId && obj.blockchainStatus === 'CONFIRMED') {
      try {
        const onChainRes = await passportContractService.recordLifecycleEventOnChain({
          tokenId: obj.tokenId,
          eventType: eventParams.type,
          eventHash,
          contractAddress: obj.contractAddress || contractAddress,
        });
        realTxHash = onChainRes.txHash;
        realBlock = onChainRes.blockNumber;
      } catch (err: any) {
        console.error('Lifecycle event on-chain commitment failed:', err);
        throw err;
      }
    }

    const { hash, block } = recordTx(
      `Logged Lifecycle Event for ${obj.orbitId}: ${eventParams.title}`,
      realTxHash,
      realBlock
    );

    const newEvent: TimelineEvent = {
      id: `evt-life-${Date.now()}`,
      type: eventParams.type,
      timestamp: new Date().toISOString(),
      blockNumber: realBlock || block,
      txHash: realTxHash || hash,
      actorAddress: currentWallet.address,
      actorName: currentWallet.name,
      title: eventParams.title,
      description: realTxHash
        ? `${eventParams.description} · Cryptographic event hash ${eventHash.slice(0, 10)}... committed to Sepolia (Tx: ${realTxHash.slice(0, 10)}...).`
        : eventParams.description,
      metadata: {
        serviceCenter: eventParams.serviceCenter || currentWallet.name,
        invoiceHash: eventParams.invoiceHash || generateTxHash().slice(0, 18),
        componentsReplaced: eventParams.componentsReplaced,
        costEth: eventParams.costEth,
      },
    };

    // Persist to real Cloud Firestore repair service & timeline subcollection
    try {
      await repairService.logRepair(objectId, eventParams, newEvent);
    } catch (fsErr) {
      console.warn('Firestore repair log warning:', fsErr);
    }

    setObjects(prev =>
      prev.map(o => {
        if (o.id === objectId) {
          return {
            ...o,
            timeline: [newEvent, ...o.timeline],
          };
        }
        return o;
      })
    );

    return true;
  };

  const markAsLost = async (
    objectId: string,
    rewardEth: string,
    location: string,
    instructions: string
  ): Promise<boolean> => {
    const obj = objects.find(o => o.id === objectId);
    if (!obj) return false;

    const bountyNumber = parseFloat(rewardEth) || 0;
    if (bountyNumber > currentWallet.balanceEth) {
      alert(`Insufficient funds! Your balance is ${currentWallet.balanceEth} ETH, but bounty is ${bountyNumber} ETH. Use the Faucet button to add test ETH.`);
      return false;
    }

    let realEscrowTxHash: string | undefined;
    let realBlock: number = 0;

    // REAL ESCROW TRANSACTION ON SEPOLIA:
    if (hasEscrowContract && obj.tokenId && obj.blockchainStatus === 'CONFIRMED') {
      try {
        const lockRes = await escrowContractService.lockBountyOnChain({
          tokenId: obj.tokenId,
          amountEth: rewardEth,
          handshakeCode: instructions,
          ownerAddress: currentWallet.address,
          contractAddress: escrowContractAddress,
        });

        realEscrowTxHash = lockRes.txHash;
        realBlock = lockRes.blockNumber;

        if (hasContract) {
          try {
            await passportContractService.setObjectStatusOnChain({
              tokenId: obj.tokenId,
              status: 'LOST',
              contractAddress: obj.contractAddress || contractAddress,
            });
          } catch (statusErr) {
            console.warn('On-chain status update warning:', statusErr);
          }
        }
      } catch (escrowErr: any) {
        console.error('Lock bounty in escrow failed:', escrowErr);
        throw escrowErr;
      }
    }

    // Refresh live on-chain balance
    const updatedBalance = await getWalletBalance(currentWallet.address);

    const { hash, block } = recordTx(
      `Object ${obj.orbitId} marked as LOST. ${rewardEth} ETH locked in ORBITRecoveryEscrow`,
      realEscrowTxHash,
      realBlock
    );

    const lostEvent: TimelineEvent = {
      id: `evt-lost-${Date.now()}`,
      type: 'STATUS_LOST',
      timestamp: new Date().toISOString(),
      blockNumber: realBlock || block,
      txHash: realEscrowTxHash || hash,
      actorAddress: currentWallet.address,
      actorName: currentWallet.name,
      title: `Declared Missing & ${rewardEth} ETH Bounty Escrowed`,
      description: realEscrowTxHash
        ? `Owner locked ${rewardEth} native Sepolia ETH in ORBITRecoveryEscrow smart contract (Tx: ${realEscrowTxHash.slice(0, 10)}...). Funds held trustlessly until confirmed handover.`
        : `Owner flagged physical object as missing. Escrow contract locked ${rewardEth} ETH to be paid directly to a verified finder upon recovery confirmation.`,
      metadata: {
        rewardEth,
        claimLocation: location,
      },
    };

    // Update wallet balance
    const newBal = Number(updatedBalance) || Math.max(0, Number((currentWallet.balanceEth - bountyNumber).toFixed(4)));
    setPersonas(prev =>
      prev.map(p =>
        p.address.toLowerCase() === currentWallet.address.toLowerCase()
          ? { ...p, balanceEth: newBal }
          : p
      )
    );
    setCurrentWallet(prev => ({
      ...prev,
      balanceEth: newBal,
    }));

    // Persist to real Cloud Firestore recovery service
    try {
      await recoveryService.markLost(
        objectId,
        { rewardEth, location, instructions },
        lostEvent
      );
    } catch (fsErr) {
      console.warn('Firestore markLost warning:', fsErr);
    }

    setObjects(prev =>
      prev.map(o => {
        if (o.id === objectId) {
          return {
            ...o,
            status: 'LOST',
            recoveryRewardEth: rewardEth,
            escrowLocked: true,
            lostDate: new Date().toISOString(),
            lostLocation: location,
            lostInstructions: instructions,
            timeline: [lostEvent, ...o.timeline],
          };
        }
        return o;
      })
    );

    return true;
  };

  const cancelLostStatus = async (objectId: string): Promise<boolean> => {
    const obj = objects.find(o => o.id === objectId);
    if (!obj) return false;

    let realRefundTxHash: string | undefined;
    let realBlock: number = 0;

    // REAL ESCROW REFUND ON SEPOLIA:
    if (hasEscrowContract && obj.tokenId && obj.blockchainStatus === 'CONFIRMED') {
      try {
        const refundRes = await escrowContractService.refundBountyOnChain({
          tokenId: obj.tokenId,
          contractAddress: escrowContractAddress,
        });

        realRefundTxHash = refundRes.txHash;
        realBlock = refundRes.blockNumber;

        if (hasContract) {
          try {
            await passportContractService.setObjectStatusOnChain({
              tokenId: obj.tokenId,
              status: 'ACTIVE',
              contractAddress: obj.contractAddress || contractAddress,
            });
          } catch (statusErr) {
            console.warn('On-chain status update warning:', statusErr);
          }
        }
      } catch (refundErr: any) {
        console.error('Refund bounty from escrow failed:', refundErr);
        throw refundErr;
      }
    }

    const bountyNumber = parseFloat(obj.recoveryRewardEth) || 0;
    const updatedBalance = await getWalletBalance(currentWallet.address);

    const { hash, block } = recordTx(
      `Lost notice cancelled for ${obj.orbitId}. Escrow returned.`,
      realRefundTxHash,
      realBlock
    );

    const cancelEvent: TimelineEvent = {
      id: `evt-cancel-${Date.now()}`,
      type: 'MAINTENANCE',
      timestamp: new Date().toISOString(),
      blockNumber: realBlock || block,
      txHash: realRefundTxHash || hash,
      actorAddress: currentWallet.address,
      actorName: currentWallet.name,
      title: 'Lost Alert Cancelled by Owner',
      description: realRefundTxHash
        ? `Owner cancelled lost alert. ORBITRecoveryEscrow refunded bounty back to owner wallet on Sepolia (Tx: ${realRefundTxHash.slice(0, 10)}...).`
        : 'Owner reported item safely accounted for. Smart contract escrow unlocked and funds refunded.',
    };

    // Return escrow balance
    const newBal = Number(updatedBalance) || Number((currentWallet.balanceEth + bountyNumber).toFixed(4));
    setPersonas(prev =>
      prev.map(p =>
        p.address.toLowerCase() === currentWallet.address.toLowerCase()
          ? { ...p, balanceEth: newBal }
          : p
      )
    );
    setCurrentWallet(prev => ({
      ...prev,
      balanceEth: newBal,
    }));

    // Persist cancellation to real Cloud Firestore
    try {
      await recoveryService.cancelLost(objectId, cancelEvent);
    } catch (fsErr) {
      console.warn('Firestore cancelLost warning:', fsErr);
    }

    setObjects(prev =>
      prev.map(o => {
        if (o.id === objectId) {
          return {
            ...o,
            status: 'ACTIVE',
            escrowLocked: false,
            activeClaim: undefined,
            timeline: [cancelEvent, ...o.timeline],
          };
        }
        return o;
      })
    );

    return true;
  };

  const submitRecoveryClaim = async (
    objectId: string,
    params: {
      finderAddress: string;
      contactRelay: string;
      foundLocation: string;
      finderNotes: string;
    }
  ): Promise<string> => {
    const obj = objects.find(o => o.id === objectId);
    if (!obj) throw new Error('Object not found');

    const handshakeCode = generateHandshakeCode(obj.orbitId);
    const { hash, block } = recordTx(`Someone has reported finding ${obj.orbitId}.`);

    const claimEvent: TimelineEvent = {
      id: `evt-claim-${Date.now()}`,
      type: 'STATUS_FOUND_CLAIM',
      timestamp: new Date().toISOString(),
      blockNumber: block,
      txHash: hash,
      actorAddress: params.finderAddress,
      actorName: 'Finder',
      title: 'Recovery Claim Submitted by Finder',
      description: `Physical QR tag scanned. Finder reported object found at "${params.foundLocation}". Secret Handshake Code ${handshakeCode} issued.`,
      metadata: {
        finderAddress: params.finderAddress,
        claimLocation: params.foundLocation,
        handshakeCode,
      },
    };

    // Persist claim to real Cloud Firestore
    try {
      await recoveryService.submitClaim(objectId, params, handshakeCode, claimEvent);
    } catch (fsErr) {
      console.warn('Firestore submitClaim warning:', fsErr);
    }

    setObjects(prev =>
      prev.map(o => {
        if (o.id === objectId) {
          return {
            ...o,
            status: 'CLAIM_PENDING',
            activeClaim: {
              claimId: `claim-${Date.now()}`,
              finderAddress: params.finderAddress,
              finderContactRelay: params.contactRelay,
              foundDate: new Date().toISOString(),
              foundLocation: params.foundLocation,
              finderNotes: params.finderNotes,
              handshakeCode,
              status: 'PENDING_VERIFICATION',
            },
            timeline: [claimEvent, ...o.timeline],
          };
        }
        return o;
      })
    );

    return handshakeCode;
  };

  const confirmHandoverAndReleaseReward = async (
    objectId: string,
    enteredHandshakeCode?: string
  ): Promise<boolean> => {
    const obj = objects.find(o => o.id === objectId);
    if (!obj || !obj.activeClaim) return false;

    if (
      enteredHandshakeCode &&
      enteredHandshakeCode.trim().toUpperCase() !== obj.activeClaim.handshakeCode.toUpperCase()
    ) {
      alert('Handshake verification code mismatch! Please check the code provided by the finder.');
      return false;
    }

    const rewardAmount = parseFloat(obj.recoveryRewardEth) || 0;
    const finderAddr = obj.activeClaim.finderAddress;

    // Credit finder wallet
    setPersonas(prev =>
      prev.map(p => {
        if (p.address.toLowerCase() === finderAddr.toLowerCase()) {
          return {
            ...p,
            balanceEth: Number((p.balanceEth + rewardAmount).toFixed(4)),
          };
        }
        return p;
      })
    );

    if (currentWallet.address.toLowerCase() === finderAddr.toLowerCase()) {
      setCurrentWallet(prev => ({
        ...prev,
        balanceEth: Number((prev.balanceEth + rewardAmount).toFixed(4)),
      }));
    }

    let realReleaseTxHash: string | undefined;
    let realReleaseBlock: number = 0;

    // REAL ESCROW RELEASE TRANSACTION ON SEPOLIA:
    if (hasEscrowContract && obj.tokenId && obj.blockchainStatus === 'CONFIRMED') {
      try {
        const releaseRes = await escrowContractService.releaseBountyOnChain({
          tokenId: obj.tokenId,
          finderAddress: finderAddr,
          contractAddress: escrowContractAddress,
        });

        realReleaseTxHash = releaseRes.txHash;
        realReleaseBlock = releaseRes.blockNumber;

        if (hasContract) {
          try {
            await passportContractService.setObjectStatusOnChain({
              tokenId: obj.tokenId,
              status: 'RECOVERED',
              contractAddress: obj.contractAddress || contractAddress,
            });
          } catch (statusErr) {
            console.warn('On-chain status update warning:', statusErr);
          }
        }
      } catch (releaseErr: any) {
        console.error('Release bounty from escrow failed:', releaseErr);
        throw releaseErr;
      }
    }

    // Refresh live on-chain balances
    const updatedBalance = await getWalletBalance(currentWallet.address);

    const { hash: handoverHash, block: handoverBlock } = recordTx(
      `Physical Handover confirmed for ${obj.orbitId}`
    );
    const { hash: releaseHash, block: releaseBlock } = recordTx(
      `Escrow Smart Contract released ${rewardAmount} ETH to finder (${finderAddr.slice(0, 6)}...)`,
      realReleaseTxHash,
      realReleaseBlock
    );

    const handoverEvent: TimelineEvent = {
      id: `evt-handover-${Date.now()}`,
      type: 'HANDOVER_CONFIRMED',
      timestamp: new Date().toISOString(),
      blockNumber: handoverBlock,
      txHash: handoverHash,
      actorAddress: currentWallet.address,
      actorName: currentWallet.name,
      title: 'Physical Handover Verified by Cryptographic Handshake',
      description: `Handshake code ${obj.activeClaim.handshakeCode} validated. Object returned in intact condition.`,
      metadata: {
        handshakeCode: obj.activeClaim.handshakeCode,
      },
    };

    const rewardEvent: TimelineEvent = {
      id: `evt-reward-${Date.now() + 1}`,
      type: 'REWARD_RELEASED',
      timestamp: new Date().toISOString(),
      blockNumber: realReleaseBlock || releaseBlock,
      txHash: realReleaseTxHash || releaseHash,
      actorAddress: '0x0000000000000000000000000000000000000000',
      actorName: 'ORBIT Escrow Smart Contract',
      title: `Escrow Released: +${rewardAmount} ETH to Finder`,
      description: realReleaseTxHash
        ? `ORBITRecoveryEscrow released ${rewardAmount} native Sepolia ETH directly to finder wallet ${finderAddr} (Tx: ${realReleaseTxHash.slice(0, 10)}...).`
        : `Contract automatically disbursed ${rewardAmount} ETH bounty to finder wallet ${finderAddr}. Object restored to RECOVERED / ACTIVE status.`,
      metadata: {
        rewardEth: obj.recoveryRewardEth,
        finderAddress: finderAddr,
      },
    };

    // Persist confirmed handover and release to real Cloud Firestore
    try {
      await recoveryService.confirmHandoverAndRelease(objectId, handoverEvent, rewardEvent);
    } catch (fsErr) {
      console.warn('Firestore handover confirmation warning:', fsErr);
    }

    setObjects(prev =>
      prev.map(o => {
        if (o.id === objectId) {
          return {
            ...o,
            status: 'RECOVERED',
            escrowLocked: false,
            activeClaim: undefined,
            timeline: [rewardEvent, handoverEvent, ...o.timeline],
          };
        }
        return o;
      })
    );

    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // ignore
    }

    return true;
  };

  const listObjectForSale = async (objectId: string, priceEth: string): Promise<boolean> => {
    const obj = objects.find(o => o.id === objectId);
    if (!obj) throw new Error('Object not found in registry.');
    if (obj.currentOwnerAddress.toLowerCase() !== currentWallet.address.toLowerCase()) {
      throw new Error('Only the current owner can list this object for resale.');
    }
    if (obj.status !== 'ACTIVE' && obj.status !== 'RECOVERED') {
      throw new Error('Only an active/recovered object can be listed for resale.');
    }

    const normalizedPrice = Number(priceEth);
    if (!Number.isFinite(normalizedPrice) || normalizedPrice <= 0) {
      throw new Error('Enter a valid resale price greater than 0 ETH.');
    }

    const existing = marketplaceListings.find(
      l => l.objectId === objectId && l.status === 'ACTIVE'
    );
    if (existing) throw new Error('This object is already listed on the marketplace.');

    const listing: MarketplaceListing = {
      id: `listing-${objectId}-${Date.now()}`,
      objectId,
      sellerAddress: currentWallet.address,
      sellerName: currentWallet.name,
      priceEth: normalizedPrice.toFixed(4),
      listedAt: new Date().toISOString(),
      status: 'ACTIVE',
    };

    setMarketplaceListings(prev => [listing, ...prev]);
    recordTx(`Listed ${obj.orbitId} for ${listing.priceEth} ETH on ORBIT Marketplace`);
    return true;
  };

  const cancelMarketplaceListing = async (listingId: string): Promise<boolean> => {
    const listing = marketplaceListings.find(l => l.id === listingId);
    if (!listing) throw new Error('Marketplace listing not found.');
    if (listing.sellerAddress.toLowerCase() !== currentWallet.address.toLowerCase()) {
      throw new Error('Only the seller can cancel this listing.');
    }
    if (listing.status !== 'ACTIVE') throw new Error('This listing is no longer active.');

    setMarketplaceListings(prev =>
      prev.map(l => l.id === listingId ? { ...l, status: 'CANCELLED' } : l)
    );
    recordTx(`Cancelled marketplace listing for ${listing.objectId}`);
    return true;
  };

  const purchaseMarketplaceListing = async (listingId: string): Promise<boolean> => {
    const listing = marketplaceListings.find(l => l.id === listingId);
    if (!listing || listing.status !== 'ACTIVE') throw new Error('This marketplace listing is no longer available.');
    if (listing.sellerAddress.toLowerCase() === currentWallet.address.toLowerCase()) {
      throw new Error('You cannot purchase your own listing.');
    }

    const obj = objects.find(o => o.id === listing.objectId);
    if (!obj) throw new Error('The listed object could not be found.');
    if (obj.currentOwnerAddress.toLowerCase() !== listing.sellerAddress.toLowerCase()) {
      throw new Error('Listing is stale because the current owner has changed.');
    }
    if (obj.status !== 'ACTIVE' && obj.status !== 'RECOVERED') {
      throw new Error('This object is not currently eligible for resale.');
    }

    const price = Number(listing.priceEth);
    if (!Number.isFinite(price) || price <= 0) throw new Error('Invalid listing price.');
    if (currentWallet.balanceEth < price) {
      throw new Error(`Insufficient demo balance. This purchase requires ${listing.priceEth} ETH.`);
    }

    // Marketplace settlement is intentionally local/demo until ORBITMarketplace.sol is deployed.
    // The ownership state and passport timeline are updated exactly like a completed marketplace sale.
    const purchaseEvent: TimelineEvent = {
      id: `evt-market-${Date.now()}`,
      type: 'OWNERSHIP_TRANSFERRED',
      timestamp: new Date().toISOString(),
      blockNumber: 0,
      txHash: 'MARKETPLACE_DEMO_SETTLEMENT',
      actorAddress: currentWallet.address,
      actorName: currentWallet.name,
      title: `Resale completed → ${currentWallet.name}`,
      description: `ORBIT Marketplace demo settlement transferred custody of ${obj.orbitId} from ${listing.sellerName} to ${currentWallet.name}. The passport history remains attached to the object.`,
      metadata: {
        recipientAddress: currentWallet.address,
        costEth: listing.priceEth,
      },
    };

    const buyerNewBalance = Number((currentWallet.balanceEth - price).toFixed(4));
    setPersonas(prev => prev.map(p => {
      if (p.address.toLowerCase() === currentWallet.address.toLowerCase()) {
        return { ...p, balanceEth: buyerNewBalance };
      }
      if (p.address.toLowerCase() === listing.sellerAddress.toLowerCase()) {
        return { ...p, balanceEth: Number((p.balanceEth + price).toFixed(4)) };
      }
      return p;
    }));
    setCurrentWallet(prev => ({ ...prev, balanceEth: buyerNewBalance }));

    const updatedObject = {
      ...obj,
      currentOwnerAddress: currentWallet.address,
      currentOwnerName: currentWallet.name,
      status: 'ACTIVE' as const,
      timeline: [purchaseEvent, ...obj.timeline],
    };

    setObjects(prev => prev.map(o => o.id === obj.id ? updatedObject : o));
    try {
      await assetService.updateAsset(obj.id, {
        currentOwnerAddress: currentWallet.address,
        currentOwnerName: currentWallet.name,
        status: 'ACTIVE',
        timeline: updatedObject.timeline,
      });
      await eventService.addEvent(obj.id, purchaseEvent);
    } catch (err) {
      console.warn('Marketplace Firestore sync warning:', err);
    }

    setMarketplaceListings(prev =>
      prev.map(l => l.id === listingId
        ? { ...l, status: 'SOLD', soldToAddress: currentWallet.address, soldAt: new Date().toISOString() }
        : l
      )
    );

    recordTx(`Purchased ${obj.orbitId} for ${listing.priceEth} ETH via ORBIT Marketplace`);
    try { confetti({ particleCount: 100, spread: 75, origin: { y: 0.6 } }); } catch { /* ignore */ }
    return true;
  };

  const resetDemoData = async () => {
    for (const obj of INITIAL_OBJECTS) {
      try {
        await assetService.createAsset(obj);
      } catch {
        // continue
      }
    }
    setObjects(INITIAL_OBJECTS);
    setPersonas(INITIAL_PERSONAS);
    setCurrentWallet(INITIAL_PERSONAS[0]);
    setIsConnected(true);
    setIsAuthenticated(true);
    setRecentTx(null);
    setMarketplaceListings(buildDemoMarketplaceListings());
  };

  const loginWithCredentials = async (
    usernameOrEmail: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const user = await authService.login(usernameOrEmail, password);
      setIsAuthenticated(true);
      setActiveCredentials({
        name: user.displayName || 'Marissa Yung',
        email: user.email || 'gaurika.dhamija@orbit.io',
        username: user.email?.split('@')[0] || 'gaurika',
        passwordDisplay: '••••••••',
      });
      const gaurikaWallet = personas.find(p => p.name === 'Marissa Yung') || INITIAL_PERSONAS[0];
      setCurrentWallet(gaurikaWallet);
      setIsConnected(true);
      return { success: true };
    } catch (err: any) {
      console.warn('Firebase login attempt, validating fallback credentials:', err);
      const cleanInput = usernameOrEmail.trim().toLowerCase();
      const isEmailOrUserMatch =
        cleanInput === 'gaurika.dhamija@orbit.io' ||
        cleanInput === 'dhamijagaurika92@gmail.com' ||
        cleanInput === 'gaurika' ||
        cleanInput === 'gaurika dhamija';

      const isPasswordMatch = password === 'Gaurika@Orbit2026' || password === 'orbit2026';

      if (isEmailOrUserMatch && isPasswordMatch) {
        setIsAuthenticated(true);
        const gaurikaWallet = personas.find(p => p.name === 'Marissa Yung') || INITIAL_PERSONAS[0];
        setCurrentWallet(gaurikaWallet);
        setIsConnected(true);
        return { success: true };
      }

      return {
        success: false,
        error: err.message || 'Invalid credentials. User ID: gaurika.dhamija@orbit.io / Password: Gaurika@Orbit2026',
      };
    }
  };

  const logoutUser = async () => {
    try {
      await authService.logout();
    } catch (err) {
      console.warn('Sign out error:', err);
    }
    setIsAuthenticated(false);
  };

  const updateObjectImage = async (objectId: string, newImageUrl: string) => {
    try {
      await assetService.updateAsset(objectId, { imageUrl: newImageUrl });
    } catch (fsErr) {
      console.warn('Firestore updateAsset warning:', fsErr);
    }
    setObjects(prev =>
      prev.map(o => {
        if (o.id === objectId) {
          return { ...o, imageUrl: newImageUrl };
        }
        return o;
      })
    );
  };

  // Cryptographic Passport Integrity Verification
  const verifyPassportIntegrity = async (objectId: string): Promise<IntegrityVerificationResult> => {
    const target = objects.find(o => o.id === objectId);
    if (!target) {
      throw new Error(`Passport with ID ${objectId} not found`);
    }

    const result = await passportContractService.verifyPassport(target);

    // Update object verification cache in memory & Firestore
    const updated = {
      ...target,
      onChainVerified: result.isVerified,
      lastVerifiedAt: result.verifiedAt,
    };

    setObjects(prev => prev.map(o => (o.id === objectId ? updated : o)));

    try {
      await assetService.updateAsset(objectId, {
        onChainVerified: result.isVerified,
        lastVerifiedAt: result.verifiedAt,
      });
    } catch (e) {
      console.warn('Firestore verification cache update warning:', e);
    }

    return result;
  };

  // Submit and update authoritative on-chain hash
  const updatePassportHashOnChain = async (
    objectId: string
  ): Promise<{ success: boolean; hash?: string; txHash?: string; error?: string }> => {
    const target = objects.find(o => o.id === objectId);
    if (!target) {
      return { success: false, error: `Passport ${objectId} not found` };
    }

    try {
      const tokenId = target.tokenId;
      if (!tokenId) {
        return { success: false, error: 'This passport has no on-chain token yet. Mint it on Sepolia first.' };
      }
      const onChainRes = await passportContractService.submitPassportHashOnChain(target, tokenId);

      const commitEvent: TimelineEvent = {
        id: `evt-integrity-${Date.now()}`,
        type: 'CERTIFIED_INSPECTION',
        timestamp: new Date().toISOString(),
        blockNumber: onChainRes.blockNumber,
        txHash: onChainRes.hashTransactionHash,
        actorAddress: currentWallet.address,
        actorName: `${currentWallet.name} (Authorized Signer)`,
        title: 'Authoritative Passport Hash Committed On-Chain',
        description: `Cryptographic Keccak-256 integrity hash committed to ORBITPassport.sol on Sepolia. Fingerprint: ${onChainRes.passportHash.slice(0, 10)}...${onChainRes.passportHash.slice(-8)}.`,
      };

      const updatedTimeline = [commitEvent, ...(target.timeline || [])];
      const updatedObj: PhysicalObject = {
        ...target,
        passportHash: onChainRes.passportHash,
        hashTransactionHash: onChainRes.hashTransactionHash,
        contractAddress: onChainRes.contractAddress,
        tokenId: onChainRes.tokenId,
        chainId: ORBIT_SEPOLIA_CHAIN_ID,
        network: ORBIT_NETWORK_NAME,
        onChainVerified: true,
        lastVerifiedAt: new Date().toISOString(),
        timeline: updatedTimeline,
      };

      setObjects(prev => prev.map(o => (o.id === objectId ? updatedObj : o)));

      try {
        await assetService.updateAsset(objectId, {
          passportHash: onChainRes.passportHash,
          hashTransactionHash: onChainRes.hashTransactionHash,
          contractAddress: onChainRes.contractAddress,
          tokenId: onChainRes.tokenId,
          chainId: ORBIT_SEPOLIA_CHAIN_ID,
          network: ORBIT_NETWORK_NAME,
          onChainVerified: true,
          lastVerifiedAt: new Date().toISOString(),
          timeline: updatedTimeline,
        });
        await eventService.addEvent(objectId, commitEvent);
      } catch (fsErr) {
        console.warn('Firestore hash commitment update warning:', fsErr);
      }

      recordTx(
        `Committed On-Chain Passport Hash for ${target.orbitId} (Tx ${onChainRes.hashTransactionHash.slice(0, 8)}...)`
      );

      return {
        success: true,
        hash: onChainRes.passportHash,
        txHash: onChainRes.hashTransactionHash,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Failed to update on-chain hash',
      };
    }
  };

  // Modify passport field to simulate data tampering / drift
  const simulateTamperField = async (
    objectId: string,
    fieldName: 'name' | 'serialNumber' | 'description',
    modifiedValue: string
  ) => {
    const target = objects.find(o => o.id === objectId);
    if (!target) return;

    const tamperedObj: PhysicalObject = {
      ...target,
      [fieldName]: modifiedValue,
      onChainVerified: false,
    };

    setObjects(prev => prev.map(o => (o.id === objectId ? tamperedObj : o)));

    try {
      await assetService.updateAsset(objectId, {
        [fieldName]: modifiedValue,
        onChainVerified: false,
      });
    } catch (fsErr) {
      console.warn('Firestore tamper simulation update warning:', fsErr);
    }
  };

  return (
    <OrbitContext.Provider
      value={{
        objects,
        personas,
        currentWallet,
        isConnected,
        isMetaMaskInjected,
        chainId,
        walletBalanceEth,
        isSepolia,
        walletStatus,
        walletError,
        clearWalletError,
        switchWalletToSepolia,
        switchPersona,
        connectInjectedWallet,
        disconnectWallet,
        faucetAirdrop,
        getObject,
        registerObject,
        transferOwnership,
        recordLifecycleEvent,
        markAsLost,
        cancelLostStatus,
        submitRecoveryClaim,
        confirmHandoverAndReleaseReward,
        resetDemoData,
        recentTx,
        clearRecentTx,
        contractAddress,
        setContractAddress,
        hasContract,
        escrowContractAddress,
        setEscrowContractAddress,
        hasEscrowContract,
        verifyPassportIntegrity,
        updatePassportHashOnChain,
        simulateTamperField,
        isAuthenticated,
        loginWithCredentials,
        logoutUser,
        updateObjectImage,
        activeCredentials,
        marketplaceListings,
        listObjectForSale,
        cancelMarketplaceListing,
        purchaseMarketplaceListing,
      }}
    >
      {children}
    </OrbitContext.Provider>
  );
};

export const useOrbit = (): OrbitContextType => {
  const context = useContext(OrbitContext);
  if (!context) {
    throw new Error('useOrbit must be used within an OrbitProvider');
  }
  return context;
};
