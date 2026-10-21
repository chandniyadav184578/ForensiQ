import React, { useState } from 'react';
import { useOrbit } from '../context/OrbitContext';
import { PhysicalObject } from '../types/orbit';
import { truncateAddress } from '../utils/crypto';
import { X, CheckCircle2, Coins, ArrowRight, ShieldCheck, KeyRound, Sparkles } from 'lucide-react';

interface HandoverConfirmModalProps {
  object: PhysicalObject | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const HandoverConfirmModal: React.FC<HandoverConfirmModalProps> = ({
  object,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { confirmHandoverAndReleaseReward, currentWallet } = useOrbit();

  const [enteredCode, setEnteredCode] = useState(object?.activeClaim?.handshakeCode || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  React.useEffect(() => {
    if (object?.activeClaim?.handshakeCode) {
      setEnteredCode(object.activeClaim.handshakeCode);
    } else {
      setEnteredCode('');
    }
    setIsCompleted(false);
  }, [object, isOpen]);

  if (!isOpen || !object || !object.activeClaim) return null;

  const claim = object.activeClaim;

  const handleConfirmHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      // Simulate cryptographic verification and smart contract release
      await new Promise(r => setTimeout(r, 1200));

      const success = await confirmHandoverAndReleaseReward(object.id, enteredCode);
      if (success) {
        setIsCompleted(true);
      }
    } catch (err) {
      console.error(err);
      alert('Handover verification failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Confirm Handover & Release Escrow</h2>
              <p className="text-xs text-slate-400">
                Cryptographic settlement for {object.orbitId}
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
        <div className="p-6 space-y-4">
          {!isCompleted ? (
            <form onSubmit={handleConfirmHandover} className="space-y-4">
              {/* Claim Summary */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Finder Address:</span>
                  <span className="font-mono text-cyan-300 font-semibold">
                    {truncateAddress(claim.finderAddress)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Found Location:</span>
                  <span className="text-slate-200 font-medium">{claim.foundLocation}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Finder Notes:</span>
                  <span className="text-slate-300 italic">{claim.finderNotes}</span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-800 pt-2 text-emerald-400 font-semibold">
                  <span>Escrow Bounty to Release:</span>
                  <span className="font-mono text-sm">{object.recoveryRewardEth} ETH</span>
                </div>
              </div>

              {/* Handshake Code Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-300">
                    Enter Handshake Code Provided by Finder *
                  </label>
                  {claim.handshakeCode && (
                    <button
                      type="button"
                      onClick={() => setEnteredCode(claim.handshakeCode)}
                      className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 bg-cyan-950/80 border border-cyan-500/40 px-2.5 py-0.5 rounded cursor-pointer transition-colors"
                    >
                      ⚡ Auto-fill: {claim.handshakeCode}
                    </button>
                  )}
                </div>

                <div className="relative">
                  <input
                    type="text"
                    required
                    value={enteredCode}
                    onChange={e => setEnteredCode(e.target.value.toUpperCase())}
                    placeholder={`e.g. ${claim.handshakeCode || 'REC-3912-X9K2'}`}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm font-mono font-bold text-cyan-300 tracking-wider focus:outline-none focus:border-cyan-500 uppercase"
                  />
                </div>

                <div className="p-3 bg-cyan-950/30 border border-cyan-800/60 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Finder's One-Time Handshake Code:</span>
                    <span className="font-mono text-base font-black text-amber-300 tracking-widest">{claim.handshakeCode}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEnteredCode(claim.handshakeCode)}
                    className="px-3 py-1.5 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors cursor-pointer"
                  >
                    Use This Code
                  </button>
                </div>

                <span className="text-[10px] text-slate-500 mt-1 block">
                  Verify physical item {object.orbitId} is in your possession before approving escrow release.
                </span>
              </div>

              {/* Submit Button */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isProcessing}
                  className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-emerald-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 rounded-lg transition-all shadow-md shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
                >
                  <Coins className="w-4 h-4" />
                  <span>{isProcessing ? 'Releasing Escrow...' : 'Release Escrow & Mark Recovered'}</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="py-8 text-center space-y-5">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-400 mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-white">Recovery Verified & Complete!</h3>
                <p className="text-xs text-slate-300 mt-1 max-w-sm mx-auto">
                  Smart contract escrow released <strong className="text-cyan-400 font-bold">{object.recoveryRewardEth} ETH</strong> to the finder's wallet.
                </p>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-left space-y-1.5 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">Object Status:</span>
                  <span className="text-emerald-400 font-bold">RECOVERED / ACTIVE</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Escrow Disbursed:</span>
                  <span className="text-cyan-400 font-bold">{object.recoveryRewardEth} ETH</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Timeline Event:</span>
                  <span className="text-slate-300">HANDOVER_CONFIRMED & REWARD_RELEASED</span>
                </div>
              </div>

              <button
                onClick={() => {
                  onSuccess();
                  onClose();
                }}
                className="w-full py-2.5 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors cursor-pointer"
              >
                Return to Object Passport
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
