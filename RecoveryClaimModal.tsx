import React, { useState } from 'react';
import { useOrbit } from '../context/OrbitContext';
import { PhysicalObject } from '../types/orbit';
import { truncateAddress } from '../utils/crypto';
import { X, ShieldAlert, Check, Coins, Lock, KeyRound, ArrowRight } from 'lucide-react';

interface RecoveryClaimModalProps {
  object: PhysicalObject | null;
  isOpen: boolean;
  onClose: () => void;
  onClaimSubmitted: () => void;
}

export const RecoveryClaimModal: React.FC<RecoveryClaimModalProps> = ({
  object,
  isOpen,
  onClose,
  onClaimSubmitted,
}) => {
  const { submitRecoveryClaim, currentWallet } = useOrbit();

  const [finderAddress, setFinderAddress] = useState(currentWallet.address);
  const [contactRelay, setContactRelay] = useState('Telegram / Signal: @finder_relay');
  const [foundLocation, setFoundLocation] = useState('Central District / Public Transit');
  const [finderNotes, setFinderNotes] = useState('I found this object.');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !object) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foundLocation) {
      alert('Please specify where you found the object.');
      return;
    }

    setIsSubmitting(true);
    try {
      const code = await submitRecoveryClaim(object.id, {
        finderAddress: finderAddress || currentWallet.address,
        contactRelay,
        foundLocation,
        finderNotes: finderNotes || 'Found intact with security QR tag attached.',
      });

      setGeneratedCode(code);
    } catch (err) {
      console.error(err);
      alert('Error filing recovery claim');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">File Recovery Claim (Finder)</h2>
              <p className="text-xs text-slate-400">
                Initiate privacy-preserving return for {object.orbitId}
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {!generatedCode ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Escrow Bounty Notice */}
              <div className="p-4 bg-gradient-to-r from-amber-950/30 via-slate-950 to-slate-950 border border-amber-500/40 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300">
                    Guaranteed Recovery Escrow Bounty
                  </span>
                  <span className="text-sm font-bold font-mono text-cyan-400">
                    {object.recoveryRewardEth} ETH
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Locked in the smart contract escrow. Released automatically to your wallet upon confirmed physical handover handshake.
                </p>
              </div>

              {/* Finder Wallet Address */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Your Web3 Wallet Address (To Receive Bounty) *
                </label>
                <input
                  type="text"
                  required
                  value={finderAddress}
                  onChange={e => setFinderAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                />
                <span className="text-[10px] text-slate-500">
                  Currently connected as: {currentWallet.name}
                </span>
              </div>

              {/* Found Location */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Location Where Object Was Found *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Park bench near Bethesda Terrace, or Cafe counter"
                  value={foundLocation}
                  onChange={e => setFoundLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Safe Contact / Relay */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Encrypted Contact Relay / Safe Drop-off Proposal
                </label>
                <input
                  type="text"
                  placeholder="e.g. Signal username, temporary burner phone, or Police Station name"
                  value={contactRelay}
                  onChange={e => setContactRelay(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
                <span className="text-[10px] text-slate-500">
                  Zero personal data is permanently stored on-chain.
                </span>
              </div>

              {/* Finder Notes / Message */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Message:
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. I found this object."
                  value={finderNotes}
                  onChange={e => setFinderNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Submit */}
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
                  disabled={isSubmitting}
                  className="px-6 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors cursor-pointer shadow-md shadow-amber-500/20"
                >
                  {isSubmitting ? 'Submitting Claim...' : '[Submit Claim]'}
                </button>
              </div>
            </form>
          ) : (
            <div className="py-6 text-center space-y-5">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 mx-auto">
                <KeyRound className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">Recovery Claim Registered!</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Provide the confidential Handshake Verification Code below during the physical item return.
                </p>
              </div>

              {/* Handshake Code Display */}
              <div className="p-4 bg-slate-950 border-2 border-dashed border-cyan-500/50 rounded-xl space-y-1">
                <div className="text-[10px] uppercase font-mono text-slate-400">
                  Confidential Handshake Verification Code
                </div>
                <div className="text-2xl font-mono font-black text-cyan-300 tracking-wider">
                  {generatedCode}
                </div>
                <div className="text-[11px] text-slate-400 pt-1">
                  The owner will enter or scan this code to verify handover and trigger the smart contract payout of <strong className="text-cyan-400 font-bold">{object.recoveryRewardEth} ETH</strong>.
                </div>
              </div>

              <button
                onClick={() => {
                  onClaimSubmitted();
                  onClose();
                }}
                className="px-6 py-2.5 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors cursor-pointer"
              >
                Proceed to Updated Passport
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
