import React, { useState } from 'react';
import { useOrbit } from '../context/OrbitContext';
import { X, ArrowRight, CheckCircle2, ShieldCheck, Wrench, AlertTriangle, Coins, KeyRound, ArrowRightLeft, Sparkles } from 'lucide-react';

interface InteractiveJourneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJumpToObject: (objectId: string) => void;
}

export const InteractiveJourneyModal: React.FC<InteractiveJourneyModalProps> = ({
  isOpen,
  onClose,
  onJumpToObject,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  if (!isOpen) return null;

  const steps = [
    {
      title: 'Step 1: Physical Creation & Identity Minting',
      subtitle: 'OBJECT #7821 · Leica M11 Rangefinder',
      icon: ShieldCheck,
      color: 'text-cyan-400',
      description:
        'The physical hardware serial number is cryptographically hashed with SHA-256 and minted into the ORBIT smart contract registry. A laser-etched titanium QR security tag is affixed to the camera baseplate.',
      codeSample: `// On-chain Mint Receipt
Contract.mintPassport({
  orbitId: "ORBIT #7821",
  serialHash: "0xe84a9c1f20b8...98f4",
  custodian: "0x71C9...2B91 (Marissa Yung)"
});`,
    },
    {
      title: 'Step 2: Initial Custody & Use (Owner A)',
      subtitle: 'Verified Custodian: Marissa Yung',
      icon: ShieldCheck,
      color: 'text-emerald-400',
      description:
        'Gaurika registers the item under her Web3 identity. She holds the cryptographic passport title in her wallet, proving legitimate first-party custody.',
      codeSample: `Status: ACTIVE
Current Custodian: 0x71C92a3Fe5b11a91e57c6691C2De083884e82B91
Warranty: METASAFE Enforced`,
    },
    {
      title: 'Step 3: Authorized Laboratory Repair',
      subtitle: 'TechFix Pro Labs Wetzlar (Certified Facility)',
      icon: Wrench,
      color: 'text-blue-400',
      description:
        'The camera undergoes ultrasonic sensor cleaning and optical alignment. The authorized laboratory signs the maintenance record on-chain, proving genuine factory servicing.',
      codeSample: `// Lifecycle Event Appended
Event: REPAIR_RECORDED
Tech Center: "TechFix Pro Labs (Wetzlar)"
Components: ["Rangefinder Prism Seal", "Dust Gasket"]
InvoiceHash: 0xinv-99214-wetzlar`,
    },
    {
      title: 'Step 4: Second-Hand Resale & Title Transfer (Owner B)',
      subtitle: 'P2P Sale to Bob Henderson',
      icon: ArrowRightLeft,
      color: 'text-purple-400',
      description:
        'Gaurika sells the camera to Bob. Before paying, Bob scans the QR tag to verify the uninterrupted repair history and unencumbered title. Custody is transferred cryptographically.',
      codeSample: `// Title Transition
From: 0x71C9... (Gaurika)
To:   0x3a9F... (Bob)
Block: #19801452 · Confirmed`,
    },
    {
      title: 'Step 5: Incident — Object Marked as LOST',
      subtitle: 'Owner Escrows 0.08 ETH Recovery Bounty',
      icon: AlertTriangle,
      color: 'text-rose-400',
      description:
        'The camera goes missing near Central Park. The custodian activates LOST status and escrows 0.08 ETH into the smart contract. The public QR page hides private details and alerts prospective buyers.',
      codeSample: `// Smart Escrow Locked
Status: LOST
EscrowBounty: 0.08 ETH (Locked in Contract)
AntiTheftAlert: ACTIVE (Do Not Purchase)`,
    },
    {
      title: 'Step 6: Finder Scans Physical QR Tag',
      subtitle: 'Charlie Davis Scans Physical Code',
      icon: KeyRound,
      color: 'text-amber-400',
      description:
        'A finder scans the physical QR tag. They see the lost alert and guaranteed 0.08 ETH bounty. They submit a claim via encrypted relay without revealing the owner\'s private contact.',
      codeSample: `// Finder Claim Initiated
FinderWallet: 0x5d4C... (Charlie)
HandshakeCode: "REC-7821-X9K2"
Status: CLAIM_PENDING`,
    },
    {
      title: 'Step 7: Physical Handover & Cryptographic Handshake',
      subtitle: 'Mutual Verification at Safe Drop-off',
      icon: KeyRound,
      color: 'text-cyan-400',
      description:
        'The owner meets the finder at the designated location or police station. The finder presents the one-time Handshake Code "REC-7821-X9K2". The owner confirms the hardware is intact.',
      codeSample: `// Handshake Verification
EnteredCode: "REC-7821-X9K2"
VerificationResult: VALIDATED`,
    },
    {
      title: 'Step 8: Escrow Release & Complete Recovery',
      subtitle: 'Contract Releases 0.08 ETH to Finder',
      icon: Coins,
      color: 'text-emerald-400',
      description:
        'The smart contract releases 0.08 ETH directly to Charlie\'s wallet. The object status changes to RECOVERED / ACTIVE, and the incident becomes part of the permanent ledger.',
      codeSample: `// Contract Payout
Contract.releaseEscrow({
  recipient: CharlieDavis,
  amount: 0.08 ETH
});
Status: RECOVERED & ACTIVE`,
    },
  ];

  const currentStep = steps[currentStepIndex];
  const Icon = currentStep.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Full Lifecycle Protocol Walkthrough</h2>
              <p className="text-xs text-slate-400">
                Created → Owner A → Repair → Owner B → Lost → Found → Recovery
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
        <div className="p-6 space-y-6">
          {/* Progress Indicator */}
          <div className="flex items-center justify-between gap-1">
            {steps.map((s, idx) => (
              <button
                key={s.title}
                onClick={() => setCurrentStepIndex(idx)}
                className={`h-2 flex-1 rounded-full transition-all ${
                  idx === currentStepIndex
                    ? 'bg-cyan-400'
                    : idx < currentStepIndex
                    ? 'bg-cyan-800'
                    : 'bg-slate-800'
                }`}
                title={s.title}
              />
            ))}
          </div>

          {/* Current Step Card */}
          <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center">
                  <Icon className={`w-5 h-5 ${currentStep.color}`} />
                </div>
                <div>
                  <span className="text-xs font-mono font-bold text-slate-400">
                    STAGE {currentStepIndex + 1} OF {steps.length}
                  </span>
                  <h3 className="text-base font-bold text-white mt-0.5">{currentStep.title}</h3>
                </div>
              </div>

              <span className="text-xs font-semibold text-cyan-400 hidden sm:inline">
                {currentStep.subtitle}
              </span>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">{currentStep.description}</p>

            {/* Code Block / Protocol State */}
            <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl font-mono text-xs text-cyan-300 overflow-x-auto">
              <pre>{currentStep.codeSample}</pre>
            </div>
          </div>
        </div>

        {/* Navigation Footer */}
        <div className="px-6 py-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between">
          <button
            disabled={currentStepIndex === 0}
            onClick={() => setCurrentStepIndex(prev => Math.max(0, prev - 1))}
            className="text-xs font-semibold text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            ← Previous Stage
          </button>

          <div className="flex items-center gap-3">
            {currentStepIndex < steps.length - 1 ? (
              <button
                onClick={() => setCurrentStepIndex(prev => Math.min(steps.length - 1, prev + 1))}
                className="px-4 py-2 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors cursor-pointer"
              >
                Next Stage →
              </button>
            ) : (
              <button
                onClick={() => {
                  onJumpToObject('orbit-7821');
                  onClose();
                }}
                className="px-5 py-2 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>Test Live on Object #7821</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
