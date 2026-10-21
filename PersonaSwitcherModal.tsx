import React, { useState } from 'react';
import { useOrbit } from '../context/OrbitContext';
import { truncateAddress } from '../utils/crypto';
import { X, Check, ShieldCheck, Wallet, RefreshCw, PlusCircle, ExternalLink } from 'lucide-react';
import { ethers } from 'ethers';

interface PersonaSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PersonaSwitcherModal: React.FC<PersonaSwitcherModalProps> = ({ isOpen, onClose }) => {
  const {
    personas,
    currentWallet,
    switchPersona,
    faucetAirdrop,
    connectInjectedWallet,
    isMetaMaskInjected,
    resetDemoData,
    isSepolia,
    walletStatus,
    walletError,
    clearWalletError,
    switchWalletToSepolia,
    isConnected,
    chainId,
    contractAddress,
    setContractAddress,
    escrowContractAddress,
    setEscrowContractAddress,
  } = useOrbit();

  const [faucetAmount] = useState('0.5');
  const [connecting, setConnecting] = useState(false);
  const passportOk = Boolean(contractAddress && ethers.isAddress(contractAddress));
  const escrowOk = Boolean(escrowContractAddress && ethers.isAddress(escrowContractAddress));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Web3 Account & Persona Switcher
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulate distinct roles to test ownership transfers, repairs, claims & rewards.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Personas List */}
        <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
          {personas.map(persona => {
            const isSelected = persona.address.toLowerCase() === currentWallet.address.toLowerCase();
            return (
              <div
                key={persona.address}
                onClick={() => {
                  switchPersona(persona.address);
                }}
                className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-cyan-950/30 border-cyan-500/60 ring-1 ring-cyan-500/40'
                    : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/60 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <img
                    src={persona.avatar}
                    alt={persona.name}
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-lg object-cover border border-slate-700 shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-white">{persona.name}</span>
                      {persona.verifiedBadge && (
                        <ShieldCheck className="w-4 h-4 text-cyan-400" />
                      )}
                    </div>
                    <div className="text-xs text-slate-400 font-medium">{persona.role}</div>
                    <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                      {truncateAddress(persona.address, 6, 6)}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-bold font-mono text-cyan-400 tabular-nums">
                    {persona.balanceEth.toFixed(3)} ETH
                  </div>
                  {isSelected ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 mt-1">
                      <Check className="w-3.5 h-3.5" />
                      Active Role
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-500 hover:text-cyan-400 mt-1 block">
                      Switch Role
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Browser MetaMask Support */}
          <div className="pt-2 space-y-2">
            <button
              disabled={connecting}
              onClick={async () => {
                setConnecting(true);
                try {
                  const success = await connectInjectedWallet();
                  if (success) onClose();
                } catch {
                  // The error is shown inline via walletError.
                } finally {
                  setConnecting(false);
                }
              }}
              className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-700 bg-slate-950/60 hover:bg-slate-800/60 transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <span>{connecting ? 'Connecting…' : isMetaMaskInjected ? (isConnected ? 'MetaMask Connected' : 'Connect MetaMask Account') : 'MetaMask Not Detected'}</span>
                    {!isConnected ? null : isSepolia && walletStatus === 'connected' ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/40">
                        Sepolia (11155111)
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        {chainId ? `Wrong network (${chainId})` : 'Switch to Sepolia'}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {currentWallet.address.startsWith('0x') ? truncateAddress(currentWallet.address, 8, 8) : 'Not connected'}
                  </div>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-400" />
            </button>

            {walletStatus === 'wrong_network' && (
              <button
                onClick={() => { void switchWalletToSepolia(); }}
                className="w-full px-3 py-2 rounded-lg text-xs font-semibold text-amber-200 bg-amber-500/10 border border-amber-500/40 hover:bg-amber-500/20 transition-colors cursor-pointer"
              >
                Switch MetaMask to Sepolia (11155111)
              </button>
            )}
            {walletError && (
              <div role="alert" className="p-2.5 rounded-lg text-[11px] leading-snug text-rose-200 bg-rose-500/10 border border-rose-500/40">
                <div className="font-mono text-[10px] text-rose-300 mb-0.5">{walletError.kind}</div>
                {walletError.message}
                <button onClick={clearWalletError} className="ml-2 underline text-rose-300 cursor-pointer">dismiss</button>
              </div>
            )}
            {!isMetaMaskInjected && (
              <div className="text-[10px] text-slate-500 leading-tight">
                Install MetaMask from metamask.io, enable it for this site, and reload. With several wallet extensions, make MetaMask the default.
              </div>
            )}

            {/* Smart Contract Configuration on Sepolia */}
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span>ORBITPassport.sol Contract (Sepolia)</span>
                {contractAddress && ethers.isAddress(contractAddress) ? (
                  <span className="text-[10px] font-mono text-emerald-400">Configured ✓</span>
                ) : (
                  <span className="text-[10px] font-mono text-amber-400">Awaiting Address</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="0x... (Deployed ORBITPassport address)"
                  value={contractAddress}
                  onChange={e => setContractAddress(e.target.value.trim())}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-cyan-300 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Recovery Escrow Contract */}
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300 pt-2 border-t border-slate-800/80">
                <span>ORBITRecoveryEscrow.sol Contract (Sepolia)</span>
                {escrowContractAddress && ethers.isAddress(escrowContractAddress) ? (
                  <span className="text-[10px] font-mono text-emerald-400">Configured ✓</span>
                ) : (
                  <span className="text-[10px] font-mono text-amber-400">Awaiting Address</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="0x... (Deployed ORBITRecoveryEscrow address)"
                  value={escrowContractAddress}
                  onChange={e => setEscrowContractAddress(e.target.value.trim())}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-pink-300 placeholder-slate-600 focus:outline-none focus:border-pink-500"
                />
              </div>

              {(!passportOk || !escrowOk) && (
                <div className="text-[10px] text-amber-300 leading-tight pt-1">
                  Config required: set {!passportOk && 'VITE_ORBIT_PASSPORT_CONTRACT_ADDRESS'}{!passportOk && !escrowOk && ' and '}{!escrowOk && 'VITE_ORBIT_ESCROW_CONTRACT_ADDRESS'} in .env (Sepolia deployment) and restart. On-chain actions stay disabled until then.
                </div>
              )}
              <div className="text-[10px] text-slate-500 leading-tight pt-1">
                Run <code className="text-slate-400">npx tsx scripts/deploy.ts</code> to deploy both contracts to Sepolia and sync addresses.
              </div>
            </div>
          </div>
        </div>

        {/* Footer with Faucet & Reset */}
        <div className="px-6 py-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Current Role Balance:</span>
            <span className="text-xs font-mono font-bold text-cyan-400">
              {currentWallet.balanceEth.toFixed(3)} ETH
            </span>
            <button
              onClick={() => faucetAirdrop(parseFloat(faucetAmount) || 0.5)}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-cyan-300 bg-cyan-950/50 border border-cyan-800/60 rounded-md hover:bg-cyan-900/60 transition-colors cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Airdrop +0.5 ETH</span>
            </button>
          </div>

          <button
            onClick={() => {
              resetDemoData();
              onClose();
            }}
            className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
            title="Reset to fresh demo seed"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reset Demo</span>
          </button>
        </div>
      </div>
    </div>
  );
};
