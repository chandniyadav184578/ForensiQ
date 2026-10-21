import React, { useState } from 'react';
import { useOrbit } from '../context/OrbitContext';
import { PhysicalObject } from '../types/orbit';
import { truncateAddress } from '../utils/crypto';
import {
  X,
  ArrowRightLeft,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { ethers } from 'ethers';
import { WalletRequiredNotice } from './WalletRequiredNotice';

interface TransferOwnershipModalProps {
  object: PhysicalObject | null;
  isOpen: boolean;
  onClose: () => void;
  onTransferred: () => void;
}

type TransferStep =
  | 'INPUT'
  | 'SIGNING_METAMASK'
  | 'BROADCASTING_SEPOLIA'
  | 'VERIFYING_ON_CHAIN'
  | 'SUCCESS'
  | 'ERROR';

export const TransferOwnershipModal: React.FC<TransferOwnershipModalProps> = ({
  object,
  isOpen,
  onClose,
  onTransferred,
}) => {
  const { transferOwnership, personas, currentWallet, contractAddress, isSepolia, recentTx } = useOrbit();

  const [recipientAddress, setRecipientAddress] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [step, setStep] = useState<TransferStep>('INPUT');
  const [confirmedTxHash, setConfirmedTxHash] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !object) return null;

  const isValidAddress = ethers.isAddress(recipientAddress);
  const isSelf = recipientAddress.toLowerCase() === currentWallet.address.toLowerCase();
  const isZeroAddress = recipientAddress === ethers.ZeroAddress;

  const handleSelectPersona = (addr: string, name: string) => {
    setRecipientAddress(addr);
    setRecipientName(name);
    setErrorMessage(null);
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!recipientAddress) {
      setErrorMessage('Please enter an Ethereum recipient wallet address.');
      return;
    }

    if (!isValidAddress) {
      setErrorMessage('Invalid Ethereum address format. Please enter a valid 0x hexadecimal address.');
      return;
    }

    if (isZeroAddress) {
      setErrorMessage('Cannot transfer ownership to the zero address (0x0000...0000).');
      return;
    }

    if (isSelf) {
      setErrorMessage('Recipient cannot be your own current wallet address.');
      return;
    }

    setStep('SIGNING_METAMASK');

    try {
      // Step: Requesting signature & broadcasting to Sepolia
      setStep('BROADCASTING_SEPOLIA');

      const ok = await transferOwnership(object.id, recipientAddress, recipientName);

      if (ok) {
        setStep('VERIFYING_ON_CHAIN');
        // Small pause to render verified state
        await new Promise(r => setTimeout(r, 600));
        setStep('SUCCESS');
        onTransferred();
      }
    } catch (err: any) {
      console.error('Transfer failed:', err);
      const msg = err.reason || err.shortMessage || err.message || 'Ownership transfer failed.';
      setErrorMessage(msg);
      setStep('ERROR');
    }
  };

  const targetContract = object.contractAddress || contractAddress;
  const isContractSet = Boolean(targetContract && ethers.isAddress(targetContract));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Transfer Title & Custody</h2>
              <p className="text-xs text-cyan-300 font-mono font-semibold">
                ORBIT ID: {object.orbitId} · Token #{object.tokenId || 1}
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

        {/* Body based on step */}
        {step === 'INPUT' && (
          <form onSubmit={handleTransfer} className="p-6 space-y-4">
            {/* Object identity summary */}
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Object Title:</span>
                <span className="font-bold text-white truncate max-w-[200px]">{object.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Hardware Serial:</span>
                <span className="font-mono text-cyan-400">{object.serialNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Current Custodian:</span>
                <span className="font-mono text-slate-300">
                  {currentWallet.name} ({truncateAddress(currentWallet.address, 6, 6)})
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-800/80 pt-1 text-[11px]">
                <span className="text-slate-400">Sepolia ERC-721 Contract:</span>
                <span className="font-mono text-pink-300">
                  {isContractSet ? truncateAddress(targetContract, 6, 6) : 'Not Configured'}
                </span>
              </div>
            </div>

            {/* Error Message if any */}
            <WalletRequiredNotice />
            {errorMessage && (
              <div className="p-3 bg-rose-950/40 border border-rose-500/50 rounded-xl text-xs text-rose-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            )}

            {/* Quick Persona Fill */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Select Demo Recipient (or enter custom Sepolia address below)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {personas
                  .filter(p => p.address.toLowerCase() !== currentWallet.address.toLowerCase())
                  .map(persona => (
                    <button
                      type="button"
                      key={persona.address}
                      onClick={() => handleSelectPersona(persona.address, persona.name)}
                      className={`p-2 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                        recipientAddress.toLowerCase() === persona.address.toLowerCase()
                          ? 'bg-cyan-950/40 border-cyan-500 text-cyan-300'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
                      }`}
                    >
                      <div className="font-bold truncate">{persona.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {truncateAddress(persona.address, 6, 4)}
                      </div>
                    </button>
                  ))}
              </div>
            </div>

            {/* Recipient Address */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-300">
                  Recipient Ethereum Address: *
                </label>
                {recipientAddress && (
                  <span
                    className={`text-[10px] font-mono ${
                      isValidAddress && !isSelf ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {isValidAddress ? (isSelf ? 'Cannot send to self' : 'Valid Address ✓') : 'Invalid Format ✗'}
                  </span>
                )}
              </div>
              <input
                type="text"
                required
                placeholder="0x71C...8293"
                value={recipientAddress}
                onChange={e => {
                  setRecipientAddress(e.target.value);
                  setErrorMessage(null);
                }}
                className={`w-full px-3 py-2 bg-slate-950 border rounded-lg text-xs font-mono text-cyan-300 placeholder-slate-600 focus:outline-none ${
                  recipientAddress && (!isValidAddress || isSelf)
                    ? 'border-rose-500 focus:border-rose-500'
                    : 'border-slate-800 focus:border-cyan-500'
                }`}
              />
            </div>

            {/* Recipient Display Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Recipient Alias / Label (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Buyer / Certified Collector"
                value={recipientName}
                onChange={e => setRecipientName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Security Warning */}
            <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl flex items-start gap-2 text-[11px] text-amber-200">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
              <span>
                On-chain ERC-721 ownership transfer via{' '}
                <strong className="text-white font-mono">safeTransferFrom()</strong> is irreversible.
                Requires signature from the verified owner wallet in MetaMask.
              </span>
            </div>

            {/* Footer Actions */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={onClose}
                className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={!isValidAddress || isSelf}
                className="flex items-center gap-1.5 px-6 py-2.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-cyan-300 hover:from-cyan-300 hover:to-cyan-200 rounded-lg transition-all shadow-md shadow-cyan-500/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Execute Sepolia Transfer</span>
              </button>
            </div>
          </form>
        )}

        {/* Processing States */}
        {(step === 'SIGNING_METAMASK' || step === 'BROADCASTING_SEPOLIA' || step === 'VERIFYING_ON_CHAIN') && (
          <div className="p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto">
              <Loader2 className="w-7 h-7 animate-spin" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">
                {step === 'SIGNING_METAMASK' && 'Requesting MetaMask Signature...'}
                {step === 'BROADCASTING_SEPOLIA' && 'Broadcasting to Ethereum Sepolia...'}
                {step === 'VERIFYING_ON_CHAIN' && 'Verifying On-Chain Ownership...'}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {step === 'SIGNING_METAMASK' &&
                  'Please confirm the safeTransferFrom transaction in your MetaMask wallet extension.'}
                {step === 'BROADCASTING_SEPOLIA' &&
                  'Transaction submitted to Sepolia mempool. Waiting for block confirmation...'}
                {step === 'VERIFYING_ON_CHAIN' &&
                  'Calling ownerOf(tokenId) on the smart contract to verify final on-chain custody before syncing database.'}
              </p>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-cyan-300 max-w-xs mx-auto">
              <div>Asset: {object.orbitId}</div>
              <div>Token ID: #{object.tokenId || 1}</div>
              <div className="truncate">To: {truncateAddress(recipientAddress, 8, 8)}</div>
            </div>
          </div>
        )}

        {/* Success State */}
        {step === 'SUCCESS' && (
          <div className="p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-extrabold text-white">Ownership Successfully Transferred!</h3>
              <p className="text-xs text-emerald-300">
                On-chain ownership verified via smart contract on Ethereum Sepolia.
              </p>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono space-y-2 text-left">
              <div className="flex justify-between">
                <span className="text-slate-400">New Custodian:</span>
                <span className="text-cyan-300 font-bold">{recipientName || 'New Owner'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Recipient Address:</span>
                <span className="text-slate-300">{truncateAddress(recipientAddress, 6, 6)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Token ID:</span>
                <span className="text-slate-200">#{object.tokenId || 1}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Network:</span>
                <span className="text-purple-300">Ethereum Sepolia (Chain 11155111)</span>
              </div>
              {isContractSet && (
                <div className="flex justify-between pt-1 border-t border-slate-800">
                  <span className="text-slate-400">Smart Contract:</span>
                  <a
                    href={`https://sepolia.etherscan.io/address/${targetContract}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-pink-400 hover:text-pink-300 flex items-center gap-1"
                  >
                    <span>{truncateAddress(targetContract, 6, 4)}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
              {recentTx?.hash && recentTx.hash.startsWith('0x') && (
                <div className="flex justify-between pt-1 border-t border-slate-800">
                  <span className="text-slate-400">Sepolia Tx Hash:</span>
                  <a
                    href={`https://sepolia.etherscan.io/tx/${recentTx.hash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono"
                  >
                    <span>{truncateAddress(recentTx.hash, 8, 6)}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                onClick={onClose}
                className="w-full py-2.5 px-4 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors cursor-pointer"
              >
                Close & View Updated Passport
              </button>
            </div>
          </div>
        )}

        {/* Error State */}
        {step === 'ERROR' && (
          <div className="p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Transfer Cancelled or Failed</h3>
              <p className="text-xs text-rose-300 leading-relaxed max-w-sm mx-auto">
                {errorMessage || 'The on-chain transaction was rejected or encountered an error.'}
              </p>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-[11px] text-slate-400 text-left space-y-1">
              <div>• Ownership in Firestore database was NOT modified.</div>
              <div>• Custody of {object.orbitId} remains with {currentWallet.name}.</div>
              <div>• You may verify network parameters or re-try the transaction.</div>
            </div>

            <div className="pt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => setStep('INPUT')}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

