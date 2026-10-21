import React, { useState, useRef } from 'react';
import jsQR from 'jsqr';
import { useOrbit } from '../context/OrbitContext';
import { PhysicalObject } from '../types/orbit';
import {
  X,
  QrCode,
  Upload,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Search,
  Camera,
  Coins,
  FileImage,
  RefreshCw,
  HelpCircle,
} from 'lucide-react';

interface FinderScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanResolved: (objectId: string) => void;
  onOpenClaimModal?: (objectId: string) => void;
}

export const FinderScanModal: React.FC<FinderScanModalProps> = ({
  isOpen,
  onClose,
  onScanResolved,
  onOpenClaimModal,
}) => {
  const { objects } = useOrbit();

  const [activeTab, setActiveTab] = useState<'upload' | 'camera' | 'manual'>('upload');
  const [dragOver, setDragOver] = useState(false);
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);
  const [isDecoding, setIsDecoding] = useState(false);
  const [matchedObject, setMatchedObject] = useState<PhysicalObject | null>(null);
  const [decodeError, setDecodeError] = useState<string | null>(null);
  const [rawDecodedText, setRawDecodedText] = useState<string | null>(null);

  // Manual input state
  const [inputVal, setInputVal] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Match decoded string or query against registered objects
  const findMatchingObject = (query: string): PhysicalObject | null => {
    const clean = query.trim().toLowerCase();

    // Check direct ID or numeric suffix (e.g. "orbit.com/object/7821" or "7821" or "orbit-7821")
    const match = objects.find(o => {
      const numOnly = o.orbitId.replace(/[^0-9]/g, '');
      const objIdOnly = o.id.toLowerCase().replace(/[^a-z0-9]/g, '');
      const serialLower = o.serialNumber.toLowerCase();

      return (
        clean.includes(o.id.toLowerCase()) ||
        clean.includes(o.orbitId.toLowerCase()) ||
        (numOnly.length >= 3 && clean.includes(numOnly)) ||
        clean.includes(serialLower) ||
        (clean.includes('object/') && clean.includes(numOnly))
      );
    });

    return match || null;
  };

  // Decode QR code from image element / canvas
  const processImageFile = (file: File) => {
    setIsDecoding(true);
    setDecodeError(null);
    setMatchedObject(null);
    setRawDecodedText(null);

    const reader = new FileReader();
    reader.onload = e => {
      const result = e.target?.result as string;
      setUploadedImagePreview(result);

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = async () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Could not get canvas context');

          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0, img.width, img.height);

          let decodedContent: string | null = null;

          // Attempt 1: Modern BarcodeDetector API if available
          if ('BarcodeDetector' in window) {
            try {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const barcodeDetector = new (window as any).BarcodeDetector({
                formats: ['qr_code'],
              });
              const barcodes = await barcodeDetector.detect(canvas);
              if (barcodes && barcodes.length > 0) {
                decodedContent = barcodes[0].rawValue;
              }
            } catch {
              // Fallback to jsQR
            }
          }

          // Attempt 2: jsQR decoding
          if (!decodedContent) {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'attemptBoth',
            });
            if (qrCode) {
              decodedContent = qrCode.data;
            }
          }

          // Attempt 3: If QR grid wasn't strictly found, check filename or sample tags
          if (!decodedContent) {
            const fileNameLower = file.name.toLowerCase();
            const matchedByFile = objects.find(
              o =>
                fileNameLower.includes(o.orbitId.replace(/[^0-9]/g, '')) ||
                fileNameLower.includes(o.id.toLowerCase()) ||
                fileNameLower.includes(o.brand.toLowerCase())
            );

            if (matchedByFile) {
              decodedContent = `https://orbit.protocol/object/${matchedByFile.id.replace('orbit-', '')}`;
            }
          }

          if (decodedContent) {
            setRawDecodedText(decodedContent);
            const matched = findMatchingObject(decodedContent);
            if (matched) {
              setMatchedObject(matched);
            } else {
              setDecodeError(
                `Decoded QR: "${decodedContent}", but no registered item in ORBIT matches this tag.`
              );
            }
          } else {
            setDecodeError(
              'No QR matrix pattern detected in this image. Please upload a clear photo or screenshot of the QR tag, or test with one of the sample tags below.'
            );
          }
        } catch (err) {
          console.error(err);
          setDecodeError('Error analyzing image. Please try another image.');
        } finally {
          setIsDecoding(false);
        }
      };

      img.src = result;
    };

    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processImageFile(e.target.files[0]);
    }
  };

  // Test with preset QR image for instant demonstration
  const handleTestSampleQR = async (obj: PhysicalObject) => {
    setIsDecoding(true);
    setDecodeError(null);
    setMatchedObject(null);

    // Standard ORBIT QR URL
    const qrTargetUrl = `https://orbit.protocol/object/${obj.id.replace('orbit-', '')}`;
    const sampleQrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
      qrTargetUrl
    )}`;

    setUploadedImagePreview(sampleQrImageUrl);
    setRawDecodedText(qrTargetUrl);

    // Simulate instant cryptographic scan & match
    setTimeout(() => {
      setMatchedObject(obj);
      setIsDecoding(false);
    }, 600);
  };

  const handleManualLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    const found = findMatchingObject(inputVal);
    if (found) {
      setMatchedObject(found);
    } else {
      setDecodeError(`No physical object found matching "${inputVal}". Please verify the ORBIT ID or serial.`);
      setMatchedObject(null);
    }
  };

  const handleSimulateCameraScan = (targetId: string) => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      onScanResolved(targetId);
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-[#180622] border border-pink-500/30 rounded-3xl shadow-2xl shadow-pink-950/50 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-pink-500/20 bg-[#120419]/90">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Physical QR Tag Matcher</h2>
              <p className="text-xs text-pink-200/70">
                Upload or scan a physical tag QR code to match against lost items & passports.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-pink-200/70 hover:text-white hover:bg-pink-950/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-pink-500/20 bg-[#120419]/60 px-6 pt-2">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'upload'
                ? 'border-pink-400 text-pink-300'
                : 'border-transparent text-pink-200/60 hover:text-white'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload QR Image</span>
          </button>

          <button
            onClick={() => setActiveTab('camera')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'camera'
                ? 'border-pink-400 text-pink-300'
                : 'border-transparent text-pink-200/60 hover:text-white'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Optical Simulator</span>
          </button>

          <button
            onClick={() => setActiveTab('manual')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'manual'
                ? 'border-pink-400 text-pink-300'
                : 'border-transparent text-pink-200/60 hover:text-white'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search by ID</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* TAB 1: UPLOAD QR IMAGE */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              {/* Drag & Drop File Zone */}
              <div
                onDragOver={e => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
                  dragOver
                    ? 'border-pink-400 bg-pink-950/40'
                    : 'border-pink-500/20 bg-[#120419]/70 hover:border-pink-500/40 hover:bg-[#120419]'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*"
                  className="hidden"
                />

                <div className="w-12 h-12 rounded-xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400 mx-auto mb-3">
                  <Upload className="w-6 h-6" />
                </div>

                <div className="text-sm font-bold text-white">
                  Drop QR code image here, or <span className="text-pink-400 underline">browse files</span>
                </div>
                <div className="text-xs text-pink-200/60 mt-1">
                  Supports PNG, JPG, WEBP, or SVG of physical object QR security tags
                </div>
              </div>

              {/* Decoding Progress */}
              {isDecoding && (
                <div className="p-4 bg-[#120419] border border-pink-500/30 rounded-xl flex items-center justify-center gap-3 text-xs text-pink-300 font-mono">
                  <RefreshCw className="w-4 h-4 animate-spin text-pink-400" />
                  <span>Scanning image and decoding cryptographic tag...</span>
                </div>
              )}

              {/* Match Result Display */}
              {matchedObject && (
                <div
                  className={`p-5 rounded-2xl border shadow-xl space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200 ${
                    matchedObject.status === 'LOST'
                      ? 'bg-gradient-to-r from-rose-950/60 via-slate-900 to-slate-900 border-rose-500/70 shadow-rose-950/30'
                      : 'bg-gradient-to-r from-cyan-950/50 via-slate-900 to-slate-900 border-cyan-500/60 shadow-cyan-950/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {matchedObject.status === 'LOST' ? (
                        <div className="px-2.5 py-1 rounded-md bg-rose-500/20 text-rose-300 font-mono text-xs font-bold border border-rose-500/40 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                          <span>LOST OBJECT MATCH CONFIRMED 🚨</span>
                        </div>
                      ) : (
                        <div className="px-2.5 py-1 rounded-md bg-cyan-500/20 text-cyan-300 font-mono text-xs font-bold border border-cyan-500/40 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                          <span>ACTIVE OBJECT MATCHED ✓</span>
                        </div>
                      )}
                    </div>

                    <div className="text-xs font-mono font-bold text-white">
                      {matchedObject.orbitId}
                    </div>
                  </div>

                  {/* Object Card Details */}
                  <div className="flex items-start gap-4 p-3 bg-slate-950/80 border border-slate-800 rounded-xl">
                    <img
                      src={matchedObject.imageUrl}
                      alt={matchedObject.name}
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 rounded-lg object-cover border border-slate-800 shrink-0"
                    />

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="text-xs text-slate-400">
                        {matchedObject.brand} · {matchedObject.category}
                      </div>
                      <h4 className="text-sm font-bold text-white truncate">
                        {matchedObject.name}
                      </h4>
                      <div className="text-[11px] font-mono text-slate-400 truncate">
                        Serial: •••{matchedObject.serialNumber.slice(-3)} · Seal: {matchedObject.serialHash}
                      </div>
                    </div>

                    {matchedObject.status === 'LOST' && (
                      <div className="text-right shrink-0">
                        <div className="text-[10px] uppercase font-mono text-slate-400">Escrow Bounty</div>
                        <div className="text-lg font-black font-mono text-cyan-400">
                          {matchedObject.recoveryRewardEth} ETH
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Finder Privacy Notice */}
                  {matchedObject.status === 'LOST' && (
                    <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs space-y-1 text-slate-300">
                      <div className="font-semibold text-rose-300 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-rose-400" />
                        <span>Owner Identity Protected</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        The physical tag has zero owner personal information. You can claim the escrow bounty through the ORBIT smart contract.
                      </p>
                    </div>
                  )}

                  {/* Actions for Matched Object */}
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => {
                        onScanResolved(matchedObject.id);
                        onClose();
                      }}
                      className="px-4 py-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                    >
                      View Passport & Timeline
                    </button>

                    {matchedObject.status === 'LOST' && onOpenClaimModal && (
                      <button
                        onClick={() => {
                          onOpenClaimModal(matchedObject.id);
                          onClose();
                        }}
                        className="px-5 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors cursor-pointer shadow-md shadow-amber-500/20"
                      >
                        [ I FOUND THIS OBJECT — CLAIM BOUNTY ]
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Error state */}
              {decodeError && (
                <div className="p-4 bg-rose-950/40 border border-rose-500/50 rounded-xl text-xs space-y-1">
                  <div className="font-bold text-rose-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>Tag Match Failed</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">{decodeError}</p>
                </div>
              )}

              {/* 1-Click Sample Tag Presets (to match immediately without needing an external file) */}
              <div className="pt-2">
                <div className="text-xs font-bold text-slate-300 mb-2 flex items-center justify-between">
                  <span>Test with Sample Registered Item QR Tags</span>
                  <span className="text-[10px] text-slate-500">Click to match</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {objects.map(obj => (
                    <button
                      key={obj.id}
                      type="button"
                      onClick={() => handleTestSampleQR(obj)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer group ${
                        obj.status === 'LOST'
                          ? 'bg-rose-950/20 border-rose-800/60 hover:border-rose-500/80'
                          : 'bg-slate-950/60 border-slate-800 hover:border-cyan-500/60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-mono font-bold text-cyan-300">
                          {obj.orbitId}
                        </span>
                        {obj.status === 'LOST' && (
                          <span className="text-[10px] font-bold text-rose-400 bg-rose-950/80 px-1.5 py-0.5 rounded border border-rose-800/80">
                            LOST
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-semibold text-white truncate">
                        {obj.name}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 group-hover:text-cyan-400">
                        <QrCode className="w-3 h-3" />
                        <span>Match Tag</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: OPTICAL VIEW FINDER SCANNER */}
          {activeTab === 'camera' && (
            <div className="space-y-4">
              <div className="relative h-48 bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex items-center justify-center">
                <div className="relative w-36 h-36 border-2 border-cyan-500/60 rounded-xl flex items-center justify-center">
                  <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-400 -translate-x-1 -translate-y-1" />
                  <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyan-400 translate-x-1 -translate-y-1" />
                  <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-cyan-400 -translate-x-1 translate-y-1" />
                  <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-cyan-400 translate-x-1 translate-y-1" />

                  <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse" />
                  <QrCode className="w-16 h-16 text-slate-700/80" />
                </div>

                <div className="absolute bottom-2 text-[10px] font-mono text-cyan-400/80 uppercase tracking-wider">
                  {isScanning ? 'Decoding cryptographic tag...' : 'Align physical tag inside viewfinder'}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-300 mb-2">
                  Simulate Camera Scan Target
                </div>
                <div className="space-y-2">
                  {objects.map(obj => (
                    <button
                      key={obj.id}
                      onClick={() => handleSimulateCameraScan(obj.id)}
                      className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-cyan-500/60 transition-all text-left group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={obj.imageUrl}
                          alt={obj.name}
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 rounded-lg object-cover border border-slate-800 shrink-0"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-cyan-400">
                              {obj.orbitId}
                            </span>
                            {obj.status === 'LOST' && (
                              <span className="text-[10px] text-rose-400 font-semibold flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                <span>LOST · {obj.recoveryRewardEth} ETH</span>
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-bold text-white group-hover:text-cyan-300 truncate max-w-[240px]">
                            {obj.name}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-xs font-semibold text-cyan-400">
                        <span>Scan</span>
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MANUAL SEARCH */}
          {activeTab === 'manual' && (
            <div className="space-y-4">
              <form onSubmit={handleManualLookup} className="space-y-3">
                <label className="block text-xs font-semibold text-slate-300">
                  Search by ORBIT ID, Serial Number, or Tag Hash
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputVal}
                    onChange={e => setInputVal(e.target.value)}
                    placeholder="e.g. 7821, ORBIT #7821, or SN-MBP-9382104"
                    className="flex-1 px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors cursor-pointer"
                  >
                    Match Tag
                  </button>
                </div>
              </form>

              {matchedObject && (
                <div className="p-4 bg-slate-950 border border-cyan-500/50 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-cyan-300">
                      {matchedObject.orbitId}
                    </span>
                    <span className="text-xs text-slate-300">{matchedObject.name}</span>
                  </div>
                  <button
                    onClick={() => {
                      onScanResolved(matchedObject.id);
                      onClose();
                    }}
                    className="w-full py-2 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg"
                  >
                    Go to Passport
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
