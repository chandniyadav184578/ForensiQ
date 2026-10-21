import React, { useState } from 'react';
import { useOrbit } from '../context/OrbitContext';
import { PhysicalObject } from '../types/orbit';
import { truncateAddress } from '../utils/crypto';
import { X, Cpu, ShieldCheck, Sparkles, AlertCircle, Camera, Check } from 'lucide-react';
import { WalletRequiredNotice } from './WalletRequiredNotice';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegistered: (newObjectId: string) => void;
}

const CATEGORIES: PhysicalObject['category'][] = [
  'Cameras & Optics',
  'Watches & Luxury',
  'Bicycles & Mobility',
  'Computing & Laptops',
  'Audio & Instruments',
  'Hardware Gear',
];

const PRESET_IMAGES = [
  { label: 'Sony Alpha Camera', url: '/images/sony_camera_a7iv_1790459142532.jpg' },
  { label: 'MacBook Air 15"', url: '/images/macbook_air_midnight_1790510690641.jpg' },
  { label: 'Trek Road Bike', url: '/images/trek_road_bicycle_1790510705506.jpg' },
  { label: 'iPhone 15 Pro Max', url: '/images/iphone_15_pro_titanium_1790510722760.jpg' },
  { label: 'Canon RF 50mm Lens', url: '/images/canon_rf_50_lens_1790510736881.jpg' },
  { label: 'ASUS ROG Gaming Laptop', url: '/images/asus_rog_gaming_laptop_1790510751769.jpg' },
  { label: 'JBL Live 660NC Headphones', url: '/images/jbl_headphones_audio_1790510771546.jpg' },
  { label: 'Keychron K2 Keyboard', url: '/images/keychron_keyboard_1790510791457.jpg' },
  { label: 'HP Spectre x360 Laptop', url: '/images/hp_spectre_laptop_1790459278757.jpg' },
  { label: 'Rolex Submariner Watch', url: '/images/rolex_submariner_watch_1790510062882.jpg' },
  { label: 'DJI Mavic 3 Pro Drone', url: '/images/dji_drone_hardware_1790510080647.jpg' },
  { label: 'OP-1 Field Synthesizer', url: '/images/synthesizer_audio_gear_1790510095743.jpg' },
];

export const RegisterModal: React.FC<RegisterModalProps> = ({ isOpen, onClose, onRegistered }) => {
  const { registerObject, currentWallet } = useOrbit();

  const [step, setStep] = useState<'DETAILS' | 'MINTING' | 'SUCCESS'>('DETAILS');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState<PhysicalObject['category']>('Cameras & Optics');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [manufactureYear, setManufactureYear] = useState<number>(new Date().getFullYear());
  const [condition, setCondition] = useState<PhysicalObject['condition']>('Pristine');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState(PRESET_IMAGES[0].url);
  const [recoveryRewardEth, setRecoveryRewardEth] = useState('0.05');
  const [emergencyInstructions, setEmergencyInstructions] = useState('');
  const [createdObj, setCreatedObj] = useState<PhysicalObject | null>(null);

  // Automatically select matching image when category changes
  const handleCategoryChange = (newCat: PhysicalObject['category']) => {
    setCategory(newCat);
    if (newCat === 'Bicycles & Mobility') {
      setImageUrl(PRESET_IMAGES[3].url); // Bicycle
    } else if (newCat === 'Computing & Laptops') {
      setImageUrl(PRESET_IMAGES[1].url); // HP Laptop
    } else if (newCat === 'Cameras & Optics') {
      setImageUrl(PRESET_IMAGES[0].url); // Camera
    }
  };

  const handleNameChange = (val: string) => {
    setName(val);
    const low = val.toLowerCase();
    if (low.includes('hp') || low.includes('spectre') || low.includes('envy') || low.includes('omen') || (low.includes('laptop') && !low.includes('macbook'))) {
      setCategory('Computing & Laptops');
      setImageUrl('/images/hp_spectre_laptop_1790459278757.jpg');
      if (!brand) setBrand('HP');
    } else if (low.includes('macbook') || low.includes('apple')) {
      setCategory('Computing & Laptops');
      setImageUrl('/images/macbook_pro_device_1790459129356.jpg');
      if (!brand) setBrand('Apple');
    } else if (low.includes('bike') || low.includes('bicycle') || low.includes('cycle')) {
      setCategory('Bicycles & Mobility');
      setImageUrl('/images/specialized_bicycle_1790459116055.jpg');
    } else if (low.includes('camera') || low.includes('sony') || low.includes('canon') || low.includes('nikon')) {
      setCategory('Cameras & Optics');
      setImageUrl('/images/sony_camera_a7iv_1790459142532.jpg');
    }
  };

  const handleBrandChange = (val: string) => {
    setBrand(val);
    const low = val.toLowerCase();
    if (low.includes('hp') || low.includes('hewlett')) {
      setCategory('Computing & Laptops');
      setImageUrl('/images/hp_spectre_laptop_1790459278757.jpg');
    } else if (low.includes('apple')) {
      setCategory('Computing & Laptops');
      setImageUrl('/images/macbook_pro_device_1790459129356.jpg');
    } else if (low.includes('sony')) {
      setCategory('Cameras & Optics');
      setImageUrl('/images/sony_camera_a7iv_1790459142532.jpg');
    } else if (low.includes('specialized') || low.includes('trek')) {
      setCategory('Bicycles & Mobility');
      setImageUrl('/images/specialized_bicycle_1790459116055.jpg');
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name || !brand || !serialNumber) {
      setErrorMessage('Please fill in required fields: Item Name, Brand, and Serial Number');
      return;
    }

    setIsSubmitting(true);
    setStep('MINTING');

    try {
      const newObj = await registerObject({
        name,
        category,
        brand,
        model: model || name,
        serialNumber,
        manufactureYear: Number(manufactureYear) || 2024,
        condition,
        description: description || `Registered ${brand} ${model || name} with verified serial ${serialNumber}.`,
        imageUrl,
        recoveryRewardEth,
        emergencyInstructions,
      });

      setCreatedObj(newObj);
      setStep('SUCCESS');
    } catch (err: any) {
      console.error('Object registration error:', err);
      const msg = err.reason || err.shortMessage || err.message || 'Object registration failed.';
      setErrorMessage(msg);
      setStep('DETAILS');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Register Physical Object</h2>
              <p className="text-xs text-slate-400">
                Bind hardware serial number to an immutable digital passport.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {step === 'DETAILS' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  <span>Registering under custody of:</span>
                  <span className="font-mono text-cyan-300 font-semibold">
                    {currentWallet.name} ({truncateAddress(currentWallet.address)})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setName('Sony Camera (A7 IV)');
                    setCategory('Cameras & Optics');
                    setBrand('Sony');
                    setModel('A7 IV');
                    setSerialNumber('SN123456');
                    setCondition('Pristine');
                    setDescription('Flagship full-frame mirrorless camera registered on ORBIT.');
                  }}
                  className="px-2.5 py-1 text-[11px] font-medium text-cyan-400 bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-800/80 rounded-md transition-all cursor-pointer"
                >
                  ⚡ Auto-fill Example (Sony A7 IV)
                </button>
              </div>

              {/* Error Alert */}
              <WalletRequiredNotice />
              {errorMessage && (
                <div className="p-3 bg-rose-950/40 border border-rose-500/50 rounded-xl text-xs text-rose-200 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{errorMessage}</span>
                </div>
              )}

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Object Category
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => handleCategoryChange(cat)}
                      className={`px-3 py-2 text-xs font-medium rounded-lg border text-left transition-all ${
                        category === cat
                          ? 'bg-pink-950/50 border-pink-500 text-pink-300 font-semibold'
                          : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name & Brand */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Item Name / Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HP Spectre x360 Laptop"
                    value={name}
                    onChange={e => handleNameChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Brand / Manufacturer *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HP, Apple, Sony, Specialized"
                    value={brand}
                    onChange={e => handleBrandChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Serial & Model */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Model or Specification
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Alpha 7 IV (ILCE-7M4)"
                    value={model}
                    onChange={e => setModel(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Physical Serial Number / UID *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SN-49201948"
                    value={serialNumber}
                    onChange={e => setSerialNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs sm:text-sm text-white placeholder-slate-500 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Year & Condition */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Manufacture Year
                  </label>
                  <input
                    type="number"
                    min="1950"
                    max="2030"
                    value={manufactureYear}
                    onChange={e => setManufactureYear(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs sm:text-sm text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Physical Condition
                  </label>
                  <select
                    value={condition}
                    onChange={e => setCondition(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="Pristine">Pristine (Mint / Unblemished)</option>
                    <option value="Excellent">Excellent (Minor cosmetic patina)</option>
                    <option value="Good">Good (Full working order, light wear)</option>
                    <option value="Fair">Fair (Noticeable exterior signs)</option>
                  </select>
                </div>
              </div>

              {/* Photo Preset Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Object Image Reference
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {PRESET_IMAGES.map((preset, idx) => (
                    <button
                      type="button"
                      key={preset.url}
                      onClick={() => setImageUrl(preset.url)}
                      className={`relative rounded-lg overflow-hidden border transition-all h-20 group ${
                        imageUrl === preset.url
                          ? 'border-cyan-400 ring-2 ring-cyan-500/40'
                          : 'border-slate-800 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={preset.url}
                        alt={preset.label}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-slate-950/60 flex items-center justify-center p-1 text-center">
                        <span className="text-[10px] font-bold text-white">{preset.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Physical Description & Distinct Features
                </label>
                <textarea
                  rows={2}
                  placeholder="Distinct serial engravings, custom modifications, included accessories..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Initial Recovery Reward Recommendation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Standard Recovery Bounty (ETH)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={recoveryRewardEth}
                    onChange={e => setRecoveryRewardEth(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs sm:text-sm text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                  <span className="text-[10px] text-slate-500">
                    Bounty escrowed if marked lost in the future.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Recovery / Safe Drop-off Note
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Return to nearest police station or notify relay"
                    value={emergencyInstructions}
                    onChange={e => setEmergencyInstructions(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Form Action Footer */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-mono">
                  Gas: ~0.0035 ETH (Simulated)
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-cyan-300 hover:from-cyan-300 hover:to-cyan-200 rounded-lg transition-all shadow-md shadow-cyan-500/20 cursor-pointer"
                  >
                    Create ORBIT Identity
                  </button>
                </div>
              </div>
            </form>
          )}

          {step === 'MINTING' && (
            <div className="py-16 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 mx-auto animate-spin">
                <Cpu className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-white">Minting Digital Hardware Passport</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Computing SHA-256 fingerprint for serial number <code className="text-cyan-300">{serialNumber}</code> and registering block receipt...
              </p>
            </div>
          )}

          {step === 'SUCCESS' && createdObj && (
            <div className="py-8 text-center space-y-5">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 mx-auto">
                <Check className="w-7 h-7" />
              </div>

              <div>
                <span className="inline-block px-3 py-1 bg-emerald-500/10 text-emerald-400 font-bold text-xs rounded-full border border-emerald-500/30 mb-2">
                  🎉 Object Registered
                </span>
                <div className="text-2xl font-black font-mono text-cyan-300">
                  {createdObj.orbitId}
                </div>
                <h3 className="text-xl font-bold text-white mt-1">{createdObj.name}</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Smart contract created object on-chain and associated with your connected wallet ({truncateAddress(currentWallet.address)}).
                </p>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-left space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">Hardware Serial:</span>
                  <span className="text-slate-300">{createdObj.serialNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Cryptographic Seal:</span>
                  <span className="text-cyan-400">{createdObj.serialHash}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Token ID:</span>
                  <span className="text-pink-300">#{createdObj.tokenId || 1}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Blockchain Status:</span>
                  <span className={createdObj.blockchainStatus === 'CONFIRMED' ? 'text-emerald-400' : 'text-amber-400'}>
                    {createdObj.blockchainStatus === 'CONFIRMED' ? 'Confirmed on Ethereum Sepolia' : 'Local Sandbox (Pending On-Chain Mint)'}
                  </span>
                </div>
                {createdObj.mintTransactionHash && (
                  <div className="flex justify-between pt-1 border-t border-slate-800/80">
                    <span className="text-slate-500">Mint Tx:</span>
                    <a
                      href={`https://sepolia.etherscan.io/tx/${createdObj.mintTransactionHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-cyan-400 hover:text-cyan-300 underline"
                    >
                      {truncateAddress(createdObj.mintTransactionHash, 8, 6)}
                    </a>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Custodian Wallet:</span>
                  <span className="text-slate-300">{truncateAddress(createdObj.currentOwnerAddress)}</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => {
                    onRegistered(createdObj.id);
                    onClose();
                  }}
                  className="px-6 py-2.5 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors cursor-pointer"
                >
                  View Digital Passport
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
