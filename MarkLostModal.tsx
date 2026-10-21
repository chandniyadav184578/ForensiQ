import React, { useState } from 'react';
import { useOrbit } from '../context/OrbitContext';
import { PhysicalObject } from '../types/orbit';
import { X, AlertTriangle, Coins, Lock, MapPin, FileText } from 'lucide-react';

interface MarkLostModalProps {
  object: PhysicalObject | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChanged: () => void;
}

export const MarkLostModal: React.FC<MarkLostModalProps> = ({
  object,
  isOpen,
  onClose,
  onStatusChanged,
}) => {
  const { markAsLost, currentWallet } = useOrbit();

  const [rewardEth, setRewardEth] = useState(object?.recoveryRewardEth || '0.08');
  const [lostLocation, setLostLocation] = useState('Central District / Public Transit');
  const [instructions, setInstructions] = useState(
    'Please do not attempt to dismantle. Please submit a claim via ORBIT to arrange safe handover and receive the ETH reward.'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !object) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lostLocation) {
      alert('Please specify the approximate location or area where the item went missing.');
      return;
    }

    setIsSubmitting(true);
    try {
      const ok = await markAsLost(object.id, rewardEth, lostLocation, instructions);
      if (ok) {
        onStatusChanged();
        onClose();
      }
    } catch (err) {
      console.error(err);
      alert('Failed to mark object as lost');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Mark Object as Lost 🚨</h2>
              <p className="text-xs text-rose-300 font-medium">
                Are you sure you want to mark {object.orbitId} as lost?
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Explicit Confirmation Notice */}
          <div className="p-4 bg-rose-950/40 border border-rose-500/50 rounded-xl space-y-1.5">
            <div className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>Confirmation:</span>
              <span className="text-rose-400">Mark {object.orbitId} ({object.name}) as LOST</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              When confirmed, the public QR page changes to: <strong className="text-rose-400">🚨 THIS OBJECT HAS BEEN REPORTED LOST</strong>.
            </p>
            <div className="text-[11px] font-mono text-cyan-300 pt-0.5">
              ✓ Owner identity protected (no personal name or phone displayed publicly).
            </div>
          </div>

          {/* Bounty Escrow Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300">
                Testnet Recovery Bounty Escrow (ETH) *
              </label>
              <span className="text-[11px] font-mono text-slate-400">
                Your Balance: {currentWallet.balanceEth.toFixed(3)} ETH
              </span>
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={rewardEth}
                onChange={e => setRewardEth(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm font-mono font-bold text-cyan-300 focus:outline-none focus:border-cyan-500"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500">
                ETH
              </span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              This amount will be locked in the smart contract and released only upon your confirmed handover.
            </span>
          </div>

          {/* Approximate Location */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Last Known Location / Area Lost *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Central Park Terrace, New York, NY"
              value={lostLocation}
              onChange={e => setLostLocation(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Recovery Instructions */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Drop-off / Recovery Instructions for Finder
            </label>
            <textarea
              rows={3}
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors cursor-pointer shadow-md shadow-rose-600/20"
            >
              <Coins className="w-4 h-4" />
              <span>{isSubmitting ? 'Funding Escrow...' : `Lock ${rewardEth} ETH & Declare Lost`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
