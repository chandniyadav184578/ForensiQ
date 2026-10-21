import React, { useState } from 'react';
import { useOrbit } from '../context/OrbitContext';
import { PhysicalObject, EventType } from '../types/orbit';
import { truncateAddress } from '../utils/crypto';
import { computePassportHash } from '../utils/passportHashing';
import { IntegrityVerificationResult } from '../blockchain/passportContractService';
import { TinyFishTools } from './TinyFishTools';
import { PassportTrustPanel } from './PassportTrustPanel';
import {
  ShieldCheck,
  QrCode,
  ArrowRightLeft,
  Wrench,
  AlertTriangle,
  Coins,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  Lock,
  KeyRound,
  FileCheck,
  ArrowLeft,
  Printer,
  Shield,
  Clock,
  Sparkles,
  MapPin,
  HelpCircle,
  Camera,
  RefreshCw,
  Tag,
} from 'lucide-react';

interface ObjectPassportViewProps {
  objectId: string;
  onBack: () => void;
  onSelectObject?: (objectId: string) => void;
  onOpenTagModal: (objectId: string) => void;
  onOpenTransferModal: (objectId: string) => void;
  onOpenLifecycleModal: (objectId: string) => void;
  onOpenLostModal: (objectId: string) => void;
  onOpenClaimModal: (objectId: string) => void;
  onOpenHandoverModal: (objectId: string) => void;
  onOpenMarketplace: () => void;
}

export const ObjectPassportView: React.FC<ObjectPassportViewProps> = ({
  objectId,
  onBack,
  onSelectObject,
  onOpenTagModal,
  onOpenTransferModal,
  onOpenLifecycleModal,
  onOpenLostModal,
  onOpenClaimModal,
  onOpenHandoverModal,
  onOpenMarketplace,
}) => {
  const {
    objects,
    getObject,
    currentWallet,
    cancelLostStatus,
    updateObjectImage,
    verifyPassportIntegrity,
    updatePassportHashOnChain,
    simulateTamperField,
  } = useOrbit();
  const obj = getObject(objectId);

  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [selectedTimelineFilter, setSelectedTimelineFilter] = useState<'ALL' | 'OWNERSHIP' | 'REPAIRS' | 'RECOVERY'>('ALL');
  const [isPhotoPickerOpen, setIsPhotoPickerOpen] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<IntegrityVerificationResult | null>(null);
  const [isUpdatingHash, setIsUpdatingHash] = useState(false);
  const [showTamperTool, setShowTamperTool] = useState(false);

  const handleVerify = async () => {
    if (!obj) return;
    setIsVerifying(true);
    try {
      const res = await verifyPassportIntegrity(obj.id);
      setVerificationResult(res);
    } catch (err: any) {
      console.warn('Verification error:', err);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCommitHashUpdate = async () => {
    if (!obj) return;
    setIsUpdatingHash(true);
    try {
      await updatePassportHashOnChain(obj.id);
      const res = await verifyPassportIntegrity(obj.id);
      setVerificationResult(res);
    } catch (err: any) {
      console.warn('Commit hash error:', err);
    } finally {
      setIsUpdatingHash(false);
    }
  };

  const currentLocalHash = obj ? computePassportHash(obj) : '';
  const onChainHash = obj?.passportHash || '';
  const isCurrentHashMatching = currentLocalHash.toLowerCase() === onChainHash.toLowerCase();
  const isVerifiedOnChain = Boolean(
    verificationResult ? verificationResult.isVerified : (obj?.onChainVerified && isCurrentHashMatching)
  );

  const PHOTO_PRESETS = [
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

  if (!obj) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-white">Object Passport Not Found</h2>
        <p className="text-xs text-slate-400">
          No hardware passport exists with ID "{objectId}".
        </p>
        <button
          onClick={onBack}
          className="px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 rounded-lg"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const isOwner = obj.currentOwnerAddress.toLowerCase() === currentWallet.address.toLowerCase();

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(label);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const filteredTimeline = obj.timeline.filter(event => {
    if (selectedTimelineFilter === 'ALL') return true;
    if (selectedTimelineFilter === 'OWNERSHIP')
      return event.type === 'MINTED' || event.type === 'OWNERSHIP_TRANSFERRED';
    if (selectedTimelineFilter === 'REPAIRS')
      return (
        event.type === 'REPAIR_RECORDED' ||
        event.type === 'MAINTENANCE' ||
        event.type === 'CERTIFIED_INSPECTION'
      );
    if (selectedTimelineFilter === 'RECOVERY')
      return (
        event.type === 'STATUS_LOST' ||
        event.type === 'STATUS_FOUND_CLAIM' ||
        event.type === 'HANDOVER_CONFIRMED' ||
        event.type === 'REWARD_RELEASED'
      );
    return true;
  });

  const getEventBadge = (type: EventType) => {
    switch (type) {
      case 'MINTED':
        return { label: 'Passport Minted', color: 'text-cyan-400', icon: ShieldCheck };
      case 'OWNERSHIP_TRANSFERRED':
        return { label: 'Custody Transferred', color: 'text-purple-400', icon: ArrowRightLeft };
      case 'REPAIR_RECORDED':
        return { label: 'Certified Repair', color: 'text-blue-400', icon: Wrench };
      case 'MAINTENANCE':
        return { label: 'Maintenance Service', color: 'text-sky-400', icon: FileCheck };
      case 'CERTIFIED_INSPECTION':
        return { label: 'Authenticity Inspection', color: 'text-teal-400', icon: Shield };
      case 'STATUS_LOST':
        return { label: 'Declared Missing (Bounty Escrowed)', color: 'text-rose-400', icon: AlertTriangle };
      case 'STATUS_FOUND_CLAIM':
        return { label: 'Finder Recovery Claim', color: 'text-amber-400', icon: QrCode };
      case 'HANDOVER_CONFIRMED':
        return { label: 'Handover Verified', color: 'text-emerald-400', icon: KeyRound };
      case 'REWARD_RELEASED':
        return { label: 'Escrow Bounty Released', color: 'text-emerald-400', icon: Coins };
      default:
        return { label: 'Event', color: 'text-slate-400', icon: Clock };
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Quick Passport Switcher Carousel */}
      <div className="p-3.5 rounded-2xl bg-[#14051a]/95 border border-pink-500/25 shadow-xl space-y-2 backdrop-blur-md">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-pink-300 font-mono flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
            <span>Select Hardware Passport ({objects.length} Registered)</span>
          </span>
          <span className="text-[10px] text-pink-200/60 font-mono">
            Active: <strong className="text-pink-300">{obj.orbitId}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 scrollbar-thin">
          {objects.map(item => {
            const isSelected = item.id === obj.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectObject && onSelectObject(item.id)}
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border text-left shrink-0 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-pink-900/70 to-[#2c0836] border-pink-400 shadow-md shadow-pink-950 text-white ring-1 ring-pink-400/40'
                    : 'bg-[#180622]/60 border-pink-500/15 hover:border-pink-500/40 text-pink-200/70 hover:text-white'
                }`}
              >
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-7 h-7 rounded-lg object-cover border border-pink-500/30"
                />
                <div className="leading-tight">
                  <div className="text-[10px] font-mono font-bold text-pink-300">
                    {item.orbitId}
                  </div>
                  <div className="text-xs font-bold truncate max-w-[140px] text-white">
                    {item.name}
                  </div>
                </div>
                {item.status === 'LOST' && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0 ml-0.5" title="LOST" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation & Status Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Registry</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400">STATUS:</span>
          {obj.status === 'LOST' && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-400 bg-rose-950/40 border border-rose-800/80 px-2.5 py-1 rounded-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              <span>LOST / BOUNTY ACTIVE</span>
            </span>
          )}
          {obj.status === 'CLAIM_PENDING' && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-950/40 border border-amber-800/80 px-2.5 py-1 rounded-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
              <span>CLAIM FILED · HANDSHAKE PENDING</span>
            </span>
          )}
          {obj.status === 'RECOVERED' && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800/80 px-2.5 py-1 rounded-lg">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>RECOVERED & ACTIVE</span>
            </span>
          )}
          {obj.status === 'ACTIVE' && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-pink-300 bg-pink-950/40 border border-pink-500/40 px-3 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-pink-400" />
              <span>VERIFIED ACTIVE PASSPORT</span>
            </span>
          )}
        </div>
      </div>

      {/* Alert Banner: When marked as LOST or CLAIM_PENDING */}
      {obj.status === 'LOST' && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-rose-950/60 via-slate-900 to-slate-900 border border-rose-500/60 shadow-xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono text-xs font-black tracking-wide border border-rose-500/40 mb-1">
                  <span>🚨 THIS OBJECT HAS BEEN REPORTED LOST</span>
                </div>
                <h3 className="text-base font-bold text-white">
                  {obj.orbitId} · {obj.brand} {obj.model}
                </h3>
                <p className="text-xs text-rose-200 mt-0.5">
                  Owner identity protected. Smart contract recovery reward locked in escrow.
                </p>
              </div>
            </div>

            <div className="text-right sm:border-l sm:border-slate-800 sm:pl-6">
              <div className="text-[10px] uppercase font-mono text-slate-400">Escrow Bounty</div>
              <div className="text-2xl font-black font-mono text-cyan-400 tabular-nums">
                {obj.recoveryRewardEth} ETH
              </div>
            </div>
          </div>

          {obj.lostInstructions && (
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-xs space-y-1">
              <div className="font-semibold text-slate-300">Finder Instructions & Safe Drop-off:</div>
              <p className="text-slate-400 leading-relaxed">{obj.lostInstructions}</p>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-rose-400" />
              <span>Area: {obj.lostLocation || 'Unknown'}</span>
            </div>

            <div className="flex items-center gap-2">
              {isOwner ? (
                <button
                  onClick={() => cancelLostStatus(obj.id)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel Lost Alert (Refund Escrow)
                </button>
              ) : null}

              <button
                onClick={() => onOpenClaimModal(obj.id)}
                className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors cursor-pointer shadow-md shadow-amber-500/20"
              >
                [ I FOUND THIS OBJECT ]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Banner: Claim Filed & Handshake Pending */}
      {obj.status === 'CLAIM_PENDING' && obj.activeClaim && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-950/50 via-slate-900 to-slate-900 border border-amber-500/60 shadow-xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Finder Recovery Claim Awaiting Handshake
                </h3>
                <p className="text-xs text-amber-200 mt-0.5">
                  Finder scanned the physical QR code and registered found item at: <strong className="text-white">{obj.activeClaim.foundLocation}</strong>
                </p>
              </div>
            </div>

            <div className="text-right sm:border-l sm:border-slate-800 sm:pl-6">
              <div className="text-[10px] uppercase font-mono text-slate-400">Escrow Ready</div>
              <div className="text-2xl font-black font-mono text-cyan-400 tabular-nums">
                {obj.recoveryRewardEth} ETH
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs space-y-1.5 font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400">Finder Web3 Wallet:</span>
              <span className="text-cyan-300">{truncateAddress(obj.activeClaim.finderAddress, 8, 8)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Encrypted Relay:</span>
              <span className="text-slate-300">{obj.activeClaim.finderContactRelay}</span>
            </div>
            <div className="flex justify-between border-t border-slate-800 pt-1.5 text-amber-300 font-semibold">
              <span>Handshake Code Issued to Finder:</span>
              <span className="font-mono text-sm tracking-wider text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/80">
                {obj.activeClaim.handshakeCode}
              </span>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              onClick={() => onOpenHandoverModal(obj.id)}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-emerald-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 rounded-lg transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
            >
              <Coins className="w-4 h-4" />
              <span>Confirm Handover & Disburse {obj.recoveryRewardEth} ETH</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Passport Card */}
      <div className="bg-[#180622]/90 border border-pink-500/20 rounded-3xl overflow-hidden shadow-2xl shadow-pink-950/40 backdrop-blur-md">
        <div className="grid grid-cols-1 lg:grid-cols-12">
          {/* Left: Hardware Photo & Physical Tag Trigger */}
          <div className="lg:col-span-5 relative bg-[#120419] flex flex-col justify-between">
            <div className="relative h-64 sm:h-80 w-full overflow-hidden">
              <img
                src={obj.imageUrl}
                alt={obj.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#180622] via-[#180622]/20 to-transparent" />

              <div className="absolute top-3 left-3">
                <span className="px-3 py-1 bg-[#120419]/90 border border-pink-500/30 rounded-lg text-xs font-mono font-bold text-pink-300 backdrop-blur-md">
                  {obj.orbitId}
                </span>
              </div>

              {/* Photo Switcher Trigger & Popover */}
              <div className="absolute top-3 right-3 z-20">
                <button
                  type="button"
                  onClick={() => setIsPhotoPickerOpen(!isPhotoPickerOpen)}
                  className="px-2.5 py-1 text-[11px] font-bold text-pink-200 bg-[#120419]/90 border border-pink-500/30 rounded-lg hover:bg-pink-950/80 transition-colors cursor-pointer flex items-center gap-1.5 shadow-md backdrop-blur-md"
                  title="Switch between HP Laptop, MacBook, Camera, or Bicycle photo"
                >
                  <Camera className="w-3.5 h-3.5 text-pink-400" />
                  <span>Change Photo</span>
                </button>

                {isPhotoPickerOpen && (
                  <div className="absolute right-0 mt-2 w-56 p-2 rounded-2xl bg-[#180622] border border-pink-500/40 shadow-2xl shadow-black space-y-1 z-30 animate-in fade-in duration-100">
                    <div className="px-2 py-1 text-[10px] font-bold font-mono uppercase text-pink-400">
                      Select Hardware Photo
                    </div>
                    {PHOTO_PRESETS.map(preset => (
                      <button
                        type="button"
                        key={preset.label}
                        onClick={() => {
                          updateObjectImage(obj.id, preset.url);
                          setIsPhotoPickerOpen(false);
                        }}
                        className={`w-full flex items-center gap-2.5 p-1.5 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                          obj.imageUrl === preset.url
                            ? 'bg-pink-950/70 border border-pink-500/40 text-pink-200 font-bold'
                            : 'hover:bg-pink-950/40 text-slate-300'
                        }`}
                      >
                        <img
                          src={preset.url}
                          alt={preset.label}
                          className="w-8 h-8 rounded-lg object-cover border border-pink-500/30"
                        />
                        <span className="truncate">{preset.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Tag Generator Banner */}
            <div className="p-4 bg-[#14041c]/95 border-t border-pink-500/20 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Physical Security Tag</div>
                  <div className="text-[11px] text-pink-200/70">Titanium plate, seal & NFC card</div>
                </div>
              </div>

              <button
                onClick={() => onOpenTagModal(obj.id)}
                className="px-4 py-1.5 text-xs font-black uppercase tracking-wider text-white bg-gradient-to-r from-[#d94680] to-[#be2b65] hover:from-[#e0528c] hover:to-[#cb3272] rounded-full transition-all cursor-pointer shadow-md shadow-pink-950/40"
              >
                Print Tag
              </button>
            </div>
          </div>

          {/* Right: Technical Specifications & Cryptographic Ledger */}
          <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>{obj.brand}</span>
                  <span>·</span>
                  <span>{obj.category}</span>
                  <span>·</span>
                  <span>Year {obj.manufactureYear}</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                  {obj.name}
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                  {obj.description}
                </p>
              </div>

              {/* Hardware Spec Grid */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                  <div className="text-[10px] uppercase font-mono text-slate-500">Hardware Serial</div>
                  <div className="text-xs font-mono font-bold text-white truncate">
                    {obj.serialNumber.length > 5 ? `••••${obj.serialNumber.slice(-3)}` : obj.serialNumber} ({obj.serialNumber})
                  </div>
                </div>

                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                  <div className="text-[10px] uppercase font-mono text-slate-500">Cryptographic Seal</div>
                  <div className="text-xs font-mono font-bold text-cyan-400 truncate">
                    {obj.serialHash}
                  </div>
                </div>

                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                  <div className="text-[10px] uppercase font-mono text-slate-500">Physical Condition</div>
                  <div className="text-xs font-semibold text-emerald-400">
                    {obj.condition}
                  </div>
                </div>

                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                  <div className="text-[10px] uppercase font-mono text-slate-500">Registered Custodian</div>
                  <div className="text-xs font-mono text-slate-300 truncate">
                    {truncateAddress(obj.currentOwnerAddress)}
                  </div>
                </div>
              </div>

              {/* Ownership Chain Flow (Owner A -> Owner B -> Owner C) */}
              <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    OWNERSHIP CHAIN (ON-CHAIN HISTORY)
                  </span>
                  <span className="text-[11px] font-mono text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Blockchain Verified ✓</span>
                  </span>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto py-1 text-xs font-mono">
                  <div className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-slate-300 shrink-0">
                    Owner A
                  </div>
                  <span className="text-cyan-400 shrink-0">→</span>
                  <div className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-slate-300 shrink-0">
                    Owner B
                  </div>
                  <span className="text-cyan-400 shrink-0">→</span>
                  <div className="px-2.5 py-1 rounded bg-cyan-950/80 border border-cyan-500/60 text-cyan-300 font-bold shrink-0">
                    Owner C (Current)
                  </div>
                </div>
              </div>

              {/* Cryptographic Passport Integrity & On-Chain Verification */}
              <div
                className={`p-4 rounded-xl border space-y-3 transition-all ${
                  isVerifiedOnChain
                    ? 'bg-emerald-950/20 border-emerald-500/40 shadow-lg shadow-emerald-950/20'
                    : 'bg-rose-950/25 border-rose-500/50 shadow-lg shadow-rose-950/20'
                }`}
              >
                {/* Header with status badge */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck
                      className={`w-4 h-4 ${isVerifiedOnChain ? 'text-emerald-400' : 'text-rose-400'}`}
                    />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      Passport Integrity
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isVerifying ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/40 text-[11px] font-mono text-cyan-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                        <span>Querying Sepolia...</span>
                      </span>
                    ) : isVerifiedOnChain ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/70 border border-emerald-500/70 text-[11px] font-mono font-bold text-emerald-300 shadow-sm">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>✓ PASSPORT INTEGRITY VERIFIED</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-950/80 border border-rose-500/80 text-[11px] font-mono font-bold text-rose-300 shadow-sm animate-pulse">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                        <span>⚠ PASSPORT DATA MISMATCH</span>
                      </span>
                    )}

                    <button
                      onClick={handleVerify}
                      disabled={isVerifying}
                      className="px-3 py-1 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <RefreshCw className={`w-3 h-3 ${isVerifying ? 'animate-spin' : ''}`} />
                      <span>{isVerifying ? 'Verifying...' : 'Verify Passport'}</span>
                    </button>
                  </div>
                </div>

                {/* Detailed Verification Breakdown when verification is performed */}
                {verificationResult && (
                  <div className="p-3 bg-black/60 border border-slate-700/80 rounded-xl space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                      <span className="text-[11px] font-bold text-slate-300">
                        Public On-Chain Verification Report
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {verificationResult.verifiedAt.slice(0, 19).replace('T', ' ')} UTC
                      </span>
                    </div>

                    <div className="space-y-1 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Queried Route:</span>
                        <span className="text-cyan-300 font-semibold">{verificationResult.comparisonDetails.queriedVia}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">On-Chain Owner:</span>
                        <span className="text-slate-200">
                          {verificationResult.onChainOwner
                            ? truncateAddress(verificationResult.onChainOwner, 6, 6)
                            : 'Token Not Found on Contract'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Stored On-Chain Hash:</span>
                        <span className="text-cyan-400 font-bold truncate max-w-[200px]" title={verificationResult.onChainHash}>
                          {truncateAddress(verificationResult.onChainHash, 8, 8)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Local Calculated Hash:</span>
                        <span className="text-slate-300 truncate max-w-[200px]" title={verificationResult.currentHash}>
                          {truncateAddress(verificationResult.currentHash, 8, 8)}
                        </span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-800 font-bold">
                        <span className="text-slate-400">Integrity Assessment:</span>
                        <span
                          className={
                            verificationResult.comparisonDetails.hashesMatch
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                          }
                        >
                          {verificationResult.comparisonDetails.hashesMatch
                            ? 'MATCH · INTEGRITY VERIFIED ✓'
                            : 'MISMATCH · HASH DIVERGENCE ✗'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Passport Hash Row */}
                <div className="p-2.5 rounded-lg bg-black/40 border border-slate-800/80 space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>PASSPORT HASH (KECCAK-256)</span>
                    <span className="text-slate-500">Cryptographic fingerprint</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="font-mono text-xs font-bold text-cyan-300 truncate"
                      title={currentLocalHash}
                    >
                      {currentLocalHash}
                    </span>
                    <button
                      onClick={() => handleCopy(currentLocalHash, 'passportHash')}
                      className="text-slate-400 hover:text-white shrink-0 p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Copy Passport Hash"
                    >
                      {copiedHash === 'passportHash' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* On-Chain Sepolia Blockchain References */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="p-2 rounded-lg bg-black/30 border border-slate-800/60">
                    <div className="text-[10px] text-slate-500 uppercase">Network</div>
                    <div className="font-bold text-slate-200 flex items-center gap-1.5 mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-400" />
                      <span>Sepolia (Ethereum Testnet)</span>
                    </div>
                  </div>

                  <div className="p-2 rounded-lg bg-black/30 border border-slate-800/60">
                    <div className="text-[10px] text-slate-500 uppercase">Token ID</div>
                    <div className="font-bold text-slate-200 mt-0.5 flex items-center justify-between">
                      <span>#{obj.tokenId || 1}</span>
                      {obj.contractAddress && (
                        <a
                          href={`https://sepolia.etherscan.io/token/${obj.contractAddress}?a=${obj.tokenId || 1}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-pink-400 hover:text-pink-300 ml-1.5 shrink-0"
                          title="View Token on Sepolia Etherscan"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="p-2 rounded-lg bg-black/30 border border-slate-800/60">
                    <div className="text-[10px] text-slate-500 uppercase">Smart Contract</div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span
                        className="truncate text-slate-300 font-mono text-[10px]"
                        title={obj.contractAddress || 'Not Configured'}
                      >
                        {obj.contractAddress ? truncateAddress(obj.contractAddress, 6, 4) : 'Pending Deployment'}
                      </span>
                      {obj.contractAddress && (
                        <a
                          href={`https://sepolia.etherscan.io/address/${obj.contractAddress}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-pink-400 hover:text-pink-300 ml-1.5 shrink-0"
                          title="View on Sepolia Etherscan"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="p-2 rounded-lg bg-black/30 border border-slate-800/60">
                    <div className="text-[10px] text-slate-500 uppercase">Transaction Hash</div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span
                        className="truncate text-cyan-400 font-mono text-[10px]"
                        title={obj.hashTransactionHash || obj.mintTransactionHash || 'Awaiting On-Chain Mint'}
                      >
                        {obj.hashTransactionHash || obj.mintTransactionHash
                          ? truncateAddress(obj.hashTransactionHash || obj.mintTransactionHash || '', 6, 4)
                          : 'Awaiting On-Chain Mint'}
                      </span>
                      {(obj.hashTransactionHash || obj.mintTransactionHash) && (
                        <a
                          href={`https://sepolia.etherscan.io/tx/${
                            obj.hashTransactionHash || obj.mintTransactionHash
                          }`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-cyan-400 hover:text-cyan-300 ml-1.5 shrink-0"
                          title="View Transaction on Sepolia Etherscan"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* If Hash Mismatch: Action to Commit and Update On-Chain */}
                {!isVerifiedOnChain && (
                  <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-600/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="text-xs text-rose-200">
                      <strong className="text-white block">Hash Divergence Detected:</strong>
                      Local data differs from authoritative on-chain hash. Submit authorized
                      on-chain update to re-align.
                    </div>
                    <button
                      onClick={handleCommitHashUpdate}
                      disabled={isUpdatingHash}
                      className="px-3.5 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 rounded-lg shrink-0 cursor-pointer disabled:opacity-50"
                    >
                      {isUpdatingHash ? 'Submitting to Sepolia...' : 'Commit & Update On-Chain Hash'}
                    </button>
                  </div>
                )}

                {/* Tamper Test & Verification Demo Inspector */}
                <div className="pt-1 border-t border-slate-800/60">
                  <button
                    type="button"
                    onClick={() => setShowTamperTool(!showTamperTool)}
                    className="text-[11px] font-mono text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                  >
                    <span>
                      {showTamperTool
                        ? '▼ Hide Integrity Tamper Tool'
                        : '▶ Test Integrity Tamper Check'}
                    </span>
                  </button>

                  {showTamperTool && (
                    <div className="mt-2 p-3 rounded-lg bg-black/60 border border-slate-800 space-y-2 text-xs">
                      <div className="text-[11px] text-slate-300 leading-relaxed">
                        Test the cryptographic integrity layer by simulating unauthorized data
                        modification (altering serial or description) to watch the smart contract
                        verify a mismatch:
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={async () => {
                            await simulateTamperField(
                              obj.id,
                              'serialNumber',
                              `${obj.serialNumber}-TAMPERED`
                            );
                            await handleVerify();
                          }}
                          className="px-2.5 py-1 bg-rose-950/80 hover:bg-rose-900 border border-rose-700 text-rose-300 rounded text-[11px] font-mono cursor-pointer"
                        >
                          Simulate Serial Alteration
                        </button>
                        <button
                          onClick={async () => {
                            await simulateTamperField(
                              obj.id,
                              'description',
                              `${obj.description} [UNAUTHORIZED DATA DRIFT]`
                            );
                            await handleVerify();
                          }}
                          className="px-2.5 py-1 bg-rose-950/80 hover:bg-rose-900 border border-rose-700 text-rose-300 rounded text-[11px] font-mono cursor-pointer"
                        >
                          Simulate Description Drift
                        </button>
                        <button
                          onClick={handleCommitHashUpdate}
                          className="px-2.5 py-1 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700 text-emerald-300 rounded text-[11px] font-mono cursor-pointer"
                        >
                          Authorize & Commit On-Chain
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Interactive Actions Toolbar */}
            <div className="pt-4 border-t border-slate-800 space-y-2">
              <div className="text-xs font-semibold text-slate-400">Available Protocol Actions</div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Actions for Owner */}
                {isOwner && (
                  <>
                    <button
                      onClick={() => onOpenTransferModal(obj.id)}
                      className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Transfer Title</span>
                    </button>

                    <button
                      onClick={onOpenMarketplace}
                      className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-pink-200 bg-pink-950/40 border border-pink-800/60 hover:bg-pink-900/40 rounded-lg transition-colors cursor-pointer"
                    >
                      <Tag className="w-3.5 h-3.5 text-pink-400" />
                      <span>List for Resale</span>
                    </button>

                    <button
                      onClick={() => onOpenLifecycleModal(obj.id)}
                      className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                    >
                      <Wrench className="w-3.5 h-3.5 text-blue-400" />
                      <span>Record Repair / Service</span>
                    </button>

                    {obj.status === 'ACTIVE' && (
                      <button
                        onClick={() => onOpenLostModal(obj.id)}
                        className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-300 bg-rose-950/40 border border-rose-800/80 hover:bg-rose-900/40 rounded-lg transition-colors cursor-pointer"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Declare Lost & Fund Escrow</span>
                      </button>
                    )}
                  </>
                )}

                {/* Service Center Role Action */}
                {currentWallet.role.includes('Certified') && (
                  <button
                    onClick={() => onOpenLifecycleModal(obj.id)}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-cyan-300 bg-cyan-950/40 border border-cyan-800 hover:bg-cyan-900/40 rounded-lg transition-colors cursor-pointer"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Authorize Lab Inspection</span>
                  </button>
                )}

                {/* Finder Claim Action */}
                {obj.status === 'LOST' && !isOwner && (
                  <button
                    onClick={() => onOpenClaimModal(obj.id)}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors cursor-pointer shadow-md shadow-amber-500/20"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>I Found This Object (Claim Bounty)</span>
                  </button>
                )}

                {/* Handover Modal Trigger if claim pending */}
                {obj.status === 'CLAIM_PENDING' && (
                  <button
                    onClick={() => onOpenHandoverModal(obj.id)}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer shadow-md shadow-emerald-500/20"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Confirm Handover Handshake</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Explainable evidence coverage: separates recorded data from verified claims */}
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 mb-8">
        <PassportTrustPanel object={obj} />
      </div>

      {/* TinyFish-powered market valuation and repair discovery */}
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <TinyFishTools object={obj} />
      </div>

      {/* Immutable Blockchain Timeline */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Tamper-Resistant Blockchain Timeline
            </h2>
            <p className="text-xs text-slate-400">
              Complete on-chain history of minting, title changes, laboratory repairs, and recovery settlements.
            </p>
          </div>

          {/* Timeline Filter Controls */}
          <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
            {[
              { id: 'ALL', label: 'All Records' },
              { id: 'OWNERSHIP', label: 'Ownership' },
              { id: 'REPAIRS', label: 'Repairs & Lab' },
              { id: 'RECOVERY', label: 'Recovery & Bounty' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedTimelineFilter(tab.id as any)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                  selectedTimelineFilter === tab.id
                    ? 'bg-slate-800 text-cyan-400 shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Timeline Events Stack */}
        <div className="relative border-l border-slate-800 ml-4 sm:ml-6 pl-6 sm:pl-8 space-y-6 pt-2">
          {filteredTimeline.map(event => {
            const badge = getEventBadge(event.type);
            const Icon = badge.icon;

            return (
              <div key={event.id} className="relative group">
                {/* Node icon on vertical line */}
                <div className="absolute -left-[37px] sm:-left-[45px] top-1 w-7 h-7 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-300 group-hover:border-cyan-500 transition-colors">
                  <Icon className={`w-3.5 h-3.5 ${badge.color}`} />
                </div>

                {/* Event Card */}
                <div className="p-4 sm:p-5 bg-slate-900/60 border border-slate-800/80 rounded-xl space-y-3 hover:border-slate-700 transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${badge.color}`}>{badge.label}</span>
                      <span className="text-slate-600">·</span>
                      <span className="text-xs text-slate-400 font-mono">
                        Block #{event.blockNumber}
                      </span>
                      {event.txHash && event.txHash !== '0x' && Number(event.blockNumber) > 0 ? (
                        <span className="text-[11px] font-mono font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-2 py-0.5 rounded flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /><span>Transaction reference recorded</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-mono font-semibold text-amber-300 bg-amber-950/30 border border-amber-800/50 px-2 py-0.5 rounded">Local record · not chain-verified</span>
                      )}
                    </div>

                    <div className="text-xs text-slate-400">
                      {new Date(event.timestamp).toLocaleString()}
                    </div>
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-white">{event.title}</h3>

                  <p className="text-xs text-slate-300 leading-relaxed">{event.description}</p>

                  {/* Metadata Proof Panel (if any) */}
                  {event.metadata && (
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono space-y-1.5">
                      {event.metadata.serviceCenter && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Service Center:</span>
                          <span className="text-cyan-300">{event.metadata.serviceCenter}</span>
                        </div>
                      )}
                      {event.metadata.invoiceHash && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Invoice Hash:</span>
                          <span className="text-slate-300">{event.metadata.invoiceHash}</span>
                        </div>
                      )}
                      {event.metadata.componentsReplaced && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Components Replaced:</span>
                          <span className="text-slate-300">
                            {event.metadata.componentsReplaced.join(', ')}
                          </span>
                        </div>
                      )}
                      {event.metadata.rewardEth && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Escrow Reward:</span>
                          <span className="text-cyan-400 font-bold">{event.metadata.rewardEth} ETH</span>
                        </div>
                      )}
                      {event.metadata.claimLocation && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Reported Location:</span>
                          <span className="text-slate-300">{event.metadata.claimLocation}</span>
                        </div>
                      )}
                      {event.metadata.handshakeCode && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Handshake Verification:</span>
                          <span className="text-emerald-400 font-bold">{event.metadata.handshakeCode}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Cryptographic Transaction Footprint */}
                  <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <span>Actor:</span>
                      <span className="text-slate-400">
                        {event.actorName || truncateAddress(event.actorAddress)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span>Tx:</span>
                      <button
                        onClick={() => handleCopy(event.txHash, event.id)}
                        className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                        title="Copy Transaction Hash"
                      >
                        <span>{truncateAddress(event.txHash, 8, 6)}</span>
                        {copiedHash === event.id ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
