import React, { useState, useEffect } from 'react';
import { PhysicalObject } from '../types/orbit';
import { generateQrDataUrl } from '../utils/qr';
import { X, Download, Printer, Copy, Check, QrCode, Shield, ExternalLink } from 'lucide-react';

interface PhysicalTagModalProps {
  object: PhysicalObject | null;
  isOpen: boolean;
  onClose: () => void;
  onSimulateScan: (objectId: string) => void;
}

export const PhysicalTagModal: React.FC<PhysicalTagModalProps> = ({
  object,
  isOpen,
  onClose,
  onSimulateScan,
}) => {
  const [qrUrl, setQrUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [tagFormat, setTagFormat] = useState<'METALLIC' | 'STICKER' | 'NFC'>('METALLIC');

  const publicUrl = object
    ? (object.contractAddress && object.tokenId
        ? `${window.location.origin}/verify/${object.contractAddress}/${object.tokenId}`
        : `${window.location.origin}${window.location.pathname}?orbit=${object.id}`)
    : '';

  useEffect(() => {
    if (object) {
      generateQrDataUrl(publicUrl, 400).then(url => setQrUrl(url));
    }
  }, [object, publicUrl]);

  if (!isOpen || !object) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!qrUrl) return;
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = `${object.orbitId.replace(/\s+/g, '_')}_QR_TAG.png`;
    link.click();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Physical QR & NFC Security Tag</h2>
              <p className="text-xs text-slate-400">
                Generate tamper-evident physical tags to attach to {object.name}.
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

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Format Selector */}
          <div className="flex items-center gap-2 p-1 bg-slate-950 border border-slate-800 rounded-xl">
            <button
              onClick={() => setTagFormat('METALLIC')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                tagFormat === 'METALLIC'
                  ? 'bg-slate-800 text-cyan-300 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Titanium Laser Plate
            </button>
            <button
              onClick={() => setTagFormat('STICKER')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                tagFormat === 'STICKER'
                  ? 'bg-slate-800 text-cyan-300 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Tamper-Proof Seal
            </button>
            <button
              onClick={() => setTagFormat('NFC')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                tagFormat === 'NFC'
                  ? 'bg-slate-800 text-cyan-300 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              NFC Contactless Card
            </button>
          </div>

          {/* Physical Tag Render Preview */}
          <div className="flex flex-col items-center justify-center p-6 bg-slate-950/80 border border-slate-800/80 rounded-2xl">
            {tagFormat === 'METALLIC' && (
              <div className="w-72 p-5 rounded-xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 border-2 border-slate-600 shadow-2xl text-center space-y-3 relative overflow-hidden">
                <div className="absolute top-1 left-2 w-1.5 h-1.5 rounded-full bg-slate-600" />
                <div className="absolute top-1 right-2 w-1.5 h-1.5 rounded-full bg-slate-600" />
                <div className="absolute bottom-1 left-2 w-1.5 h-1.5 rounded-full bg-slate-600" />
                <div className="absolute bottom-1 right-2 w-1.5 h-1.5 rounded-full bg-slate-600" />

                <div className="flex items-center justify-between text-[10px] font-mono text-cyan-400 tracking-wider">
                  <span>ORBIT PROTOCOL</span>
                  <span className="font-bold">{object.orbitId}</span>
                </div>

                <div className="bg-white p-3 rounded-lg mx-auto w-36 h-36 flex items-center justify-center shadow-inner">
                  {qrUrl ? (
                    <img src={qrUrl} alt="ORBIT QR Tag" className="w-full h-full object-contain" />
                  ) : (
                    <div className="w-full h-full bg-slate-100 animate-pulse" />
                  )}
                </div>

                <div>
                  <div className="text-[11px] font-bold text-white tracking-wide truncate">
                    {object.brand} · {object.model}
                  </div>
                  <div className="text-[9px] font-mono text-slate-400 mt-0.5">
                    SN: {object.serialNumber}
                  </div>
                </div>

                <div className="text-[9px] text-slate-400 border-t border-slate-700/60 pt-1.5">
                  SCAN TO VERIFY PROVENANCE & RECOVERY ESCROW
                </div>
              </div>
            )}

            {tagFormat === 'STICKER' && (
              <div className="w-72 p-4 rounded-lg bg-gradient-to-r from-cyan-950 via-slate-900 to-slate-950 border border-cyan-500/50 shadow-xl text-center space-y-2 relative">
                <div className="flex items-center justify-between text-[10px] font-bold text-cyan-400">
                  <div className="flex items-center gap-1">
                    <Shield className="w-3 h-3 text-cyan-400" />
                    <span>SECURITY SEAL</span>
                  </div>
                  <span className="font-mono">{object.orbitId}</span>
                </div>

                <div className="bg-white p-2.5 rounded mx-auto w-32 h-32 flex items-center justify-center">
                  {qrUrl && <img src={qrUrl} alt="ORBIT QR" className="w-full h-full object-contain" />}
                </div>

                <div className="text-[10px] text-rose-400 font-mono font-semibold">
                  DO NOT REMOVE · TAMPER DETECTED ON CHAIN
                </div>
              </div>
            )}

            {tagFormat === 'NFC' && (
              <div className="w-80 h-48 p-4 rounded-xl bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950 border border-cyan-800 shadow-2xl flex flex-col justify-between text-left relative">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded bg-cyan-400 text-slate-950 font-black text-xs flex items-center justify-center">
                      O
                    </div>
                    <span className="text-xs font-bold text-white tracking-wider">
                      ORBIT PASSPORT
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-cyan-400">
                    {object.orbitId}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="bg-white p-1 rounded w-16 h-16 shrink-0">
                    {qrUrl && <img src={qrUrl} alt="ORBIT QR" className="w-full h-full" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white line-clamp-1">{object.name}</div>
                    <div className="text-[10px] font-mono text-slate-400">
                      SN: {object.serialNumber}
                    </div>
                    <div className="text-[10px] text-cyan-300 font-medium mt-1">
                      NFC Contactless Chip Encoded
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 border-t border-slate-800 pt-1">
                  <span>METASAFE HARDWARE LEDGER</span>
                  <span>TAP TO INSPECT</span>
                </div>
              </div>
            )}

            {/* Simulated Scan Test Button */}
            <button
              onClick={() => {
                onClose();
                onSimulateScan(object.id);
              }}
              className="mt-5 flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors cursor-pointer"
            >
              <QrCode className="w-4 h-4" />
              <span>Simulate Scanning This Tag (Finder Flow)</span>
            </button>
          </div>

          {/* Public QR Scan View Preview (orbit.com/object/xxxx) */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
              <span className="font-mono text-cyan-400">orbit.com/object/{object.id.replace('orbit-', '')}</span>
              <span className="text-[11px] text-slate-500 font-mono">Public Verification Page (Zero Owner PII)</span>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-mono font-bold text-cyan-300">{object.orbitId}</div>
                <div className="text-sm font-bold text-white uppercase">{object.brand} {object.model}</div>
              </div>
              <div className="text-right">
                <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
                  object.status === 'LOST' ? 'bg-rose-950/60 text-rose-400 border border-rose-800/80' : 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/80'
                }`}>
                  STATUS: {object.status}
                </span>
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <div className="text-emerald-400 font-semibold flex items-center gap-1.5">
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Identity Verified</span>
              </div>
              <div className="text-emerald-400 font-semibold flex items-center gap-1.5">
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Ownership Record Exists</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => {
                  onClose();
                  onSimulateScan(object.id);
                }}
                className="px-3 py-1.5 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors cursor-pointer"
              >
                [View Timeline]
              </button>
            </div>
          </div>

          {/* Copy Public Link Bar */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-2">
            <div className="truncate text-xs font-mono text-slate-400">{publicUrl}</div>
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md transition-colors shrink-0 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Link'}</span>
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Physical Tag</span>
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Download High-Res QR PNG</span>
          </button>
        </div>
      </div>
    </div>
  );
};
