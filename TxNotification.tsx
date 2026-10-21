import React from 'react';
import { useOrbit } from '../context/OrbitContext';
import { SEPOLIA_EXPLORER } from '../blockchain/wallet';
import { truncateAddress } from '../utils/crypto';
import { CheckCircle2, ExternalLink, X, ShieldCheck } from 'lucide-react';

export const TxNotification: React.FC = () => {
  const { recentTx, clearRecentTx } = useOrbit();

  if (!recentTx) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-md w-full p-4 bg-slate-900 border border-cyan-500/50 rounded-2xl shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-5 duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
            <CheckCircle2 className="w-4 h-4" />
          </div>

          <div className="space-y-1">
            <div className="text-xs font-bold text-white">
              {recentTx.kind === 'onchain' ? 'Confirmed on Ethereum Sepolia' : recentTx.kind === 'wallet' ? 'Wallet connected' : 'Local demo action (not recorded on-chain)'}
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">{recentTx.summary}</p>

            {recentTx.kind === 'onchain' && recentTx.hash && (
              <div className="flex items-center gap-3 text-[10px] font-mono text-cyan-400 pt-1">
                <span>Block #{recentTx.block}</span>
                <span>·</span>
                <a href={`${SEPOLIA_EXPLORER}/tx/${recentTx.hash}`} target="_blank" rel="noreferrer" className="underline text-slate-300 hover:text-white">
                  TX: {truncateAddress(recentTx.hash, 8, 6)}
                </a>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={clearRecentTx}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
