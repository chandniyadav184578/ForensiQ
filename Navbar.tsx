import React from 'react';
import { useOrbit } from '../context/OrbitContext';
import { truncateAddress } from '../utils/crypto';
import { MetaMaskLogo } from './MetaMaskLogo';
import { ShieldCheck, ChevronDown, Plus, QrCode, User, Store, Sparkles } from 'lucide-react';

interface NavbarProps {
  currentTab: 'landing' | 'dashboard' | 'intelligence' | 'passport' | 'explorer' | 'marketplace' | 'verify';
  onNavigate: (tab: 'landing' | 'dashboard' | 'intelligence' | 'passport' | 'explorer' | 'marketplace' | 'verify', objectId?: string) => void;
  onOpenRegister: () => void;
  onOpenScanner: () => void;
  onOpenPersonaModal: () => void;
  onOpenUserDashboard: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onNavigate,
  onOpenRegister,
  onOpenScanner,
  onOpenPersonaModal,
  onOpenUserDashboard,
}) => {
  const { currentWallet, faucetAirdrop, isAuthenticated, activeCredentials, walletStatus, chainId } = useOrbit();
  const walletLive = walletStatus === 'connected';
  const walletWrongNet = walletStatus === 'wrong_network';

  return (
    <header className="sticky top-3 z-40 w-full px-3 sm:px-6">
      <div className="max-w-7xl mx-auto flex min-w-0 items-center justify-between gap-3 px-3 sm:px-5 py-2.5 rounded-2xl sm:rounded-full bg-[#120417]/85 backdrop-blur-xl border border-pink-500/20 shadow-2xl shadow-pink-950/40">
        {/* Left: Emblem Brand */}
        <button
          onClick={() => onNavigate('landing')}
          className="flex items-center gap-3 text-left group transition-transform active:scale-95 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-300 via-pink-500 to-[#be2b65] p-[1.5px] shadow-md shadow-pink-500/20">
            <div className="w-full h-full rounded-full bg-[#15041a] flex items-center justify-center">
              <span className="text-xs font-black text-amber-300 tracking-tighter">▲</span>
            </div>
          </div>
          <div>
            <span className="text-sm font-extrabold tracking-tight text-white block leading-none group-hover:text-pink-300 transition-colors">
              ORBIT
            </span>
            <span className="text-[9px] text-pink-400 font-mono tracking-widest uppercase block mt-0.5">
              Protocol
            </span>
          </div>
        </button>

        {/* Center: Navigation Links */}
        <nav className="hidden lg:flex min-w-0 items-center gap-4 xl:gap-5 text-[10px] xl:text-[11px] font-bold tracking-wider text-slate-300 uppercase whitespace-nowrap">
          <button
            onClick={() => onNavigate('landing')}
            className={`transition-colors hover:text-pink-300 cursor-pointer ${
              currentTab === 'landing' ? 'text-pink-400' : ''
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => onNavigate('dashboard')}
            className={`transition-colors hover:text-pink-300 cursor-pointer ${
              currentTab === 'dashboard' ? 'text-pink-400' : ''
            }`}
          >
            Passports
          </button>
          <button
            onClick={() => onNavigate('intelligence')}
            className={`flex items-center gap-1.5 transition-colors hover:text-pink-300 cursor-pointer ${
              currentTab === 'intelligence' ? 'text-pink-400' : 'text-slate-300'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
            <span>Intelligence</span>
          </button>
          <button
            onClick={() => onNavigate('marketplace')}
            className={`flex items-center gap-1.5 transition-colors hover:text-pink-300 cursor-pointer ${
              currentTab === 'marketplace' ? 'text-pink-400' : 'text-slate-300'
            }`}
          >
            <Store className="w-3.5 h-3.5 text-pink-400" />
            <span>Marketplace</span>
          </button>
          <button
            onClick={() => onNavigate('verify')}
            className={`flex items-center gap-1.5 transition-colors hover:text-cyan-300 cursor-pointer ${
              currentTab === 'verify' ? 'text-cyan-400' : 'text-slate-300'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Public Verify</span>
          </button>
          <button
            onClick={onOpenScanner}
            className="flex items-center gap-1.5 transition-colors text-pink-300 hover:text-white cursor-pointer"
          >
            <QrCode className="w-3.5 h-3.5 text-pink-400" />
            <span>Scan Tag</span>
          </button>
        </nav>

        {/* Right: User Login / Profile Dashboard + Register CTA */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {/* User Account / Login Button */}
          <button
            onClick={onOpenUserDashboard}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border transition-all cursor-pointer shadow-sm ${
              isAuthenticated
                ? 'bg-gradient-to-r from-pink-950/70 to-[#22072a] border-pink-500/40 text-pink-200 hover:border-pink-400'
                : 'bg-rose-950/40 border-rose-500/50 text-rose-200 hover:bg-rose-900/40'
            }`}
            title="User Account & Custody Dashboard"
          >
            <div className="w-5 h-5 rounded-full bg-pink-500/20 flex items-center justify-center text-pink-300">
              <User className="w-3.5 h-3.5" />
            </div>
            <div className="text-left leading-tight hidden sm:block">
              <div className="flex items-center gap-1 text-[11px] font-extrabold text-white">
                <span>{isAuthenticated ? activeCredentials.name : 'Sign In'}</span>
                {isAuthenticated && <ShieldCheck className="w-3 h-3 text-emerald-400" />}
              </div>
              <div className="text-[9px] font-mono text-pink-300/80">
                {isAuthenticated ? 'User Dashboard' : 'Enter Credentials'}
              </div>
            </div>
          </button>

          {/* Quick Register Action */}
          <button
            onClick={onOpenRegister}
            className="flex items-center gap-1.5 px-4 sm:px-5 py-1.5 sm:py-2 text-xs font-black tracking-wide uppercase text-white bg-gradient-to-r from-[#d94680] to-[#be2b65] hover:from-[#e0528c] hover:to-[#cb3272] rounded-full shadow-lg shadow-pink-600/30 transition-all cursor-pointer active:scale-95 border border-pink-400/30"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span className="hidden sm:inline">Register Object</span>
            <span className="sm:hidden">Register</span>
          </button>

          {/* Wallet: opens the existing MetaMask / persona dialog */}
          <button
            onClick={onOpenPersonaModal}
            aria-label={walletLive ? 'MetaMask connected' : walletWrongNet ? 'Wrong network, open wallet' : 'Connect wallet'}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all text-left cursor-pointer group shadow-sm active:scale-95 ${
              walletLive
                ? 'bg-[#1e0726]/80 border-emerald-500/40 hover:border-emerald-400/70'
                : walletWrongNet
                  ? 'bg-[#1e0726]/80 border-amber-500/50 hover:border-amber-400/70'
                  : 'bg-[#1e0726]/80 border-pink-500/30 hover:border-pink-400/60'
            }`}
            title={walletLive ? 'MetaMask connected on Sepolia' : walletWrongNet ? 'MetaMask is on the wrong network. Open to switch to Sepolia' : walletStatus === 'not_detected' ? 'MetaMask not detected' : 'Connect MetaMask'}
          >
            <MetaMaskLogo className="w-4 h-4 shrink-0" />
            {walletLive || walletWrongNet ? (
              <>
                <span className={`w-1.5 h-1.5 rounded-full ${walletLive ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                <span className="text-[11px] font-semibold text-pink-100 font-mono">
                  {`${currentWallet.address.slice(0, 6)}…${currentWallet.address.slice(-4)}`}
                </span>
                <span className={`hidden sm:inline text-[10px] font-mono px-1.5 py-0.5 rounded ${walletLive ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>
                  {walletLive ? 'Sepolia' : `Chain ${chainId ?? '?'}`}
                </span>
              </>
            ) : (
              <span className="text-[11px] font-bold text-pink-100">
                {walletStatus === 'connecting' ? 'Connecting…' : 'Connect Wallet'}
              </span>
            )}
            <ChevronDown className="w-3 h-3 text-pink-300/70 group-hover:text-pink-200 transition-colors" />
          </button>

          {/* Faucet */}
          <button
            onClick={() => faucetAirdrop(0.5)}
            className={`${walletLive ? 'hidden' : 'hidden xl:flex'} items-center gap-1 px-2.5 py-1 text-[10px] font-mono font-bold text-pink-300 bg-[#25082f]/80 border border-pink-500/30 rounded-full hover:bg-pink-950/60 transition-colors cursor-pointer`}
            title="Airdrop 0.5 testnet ETH"
          >
            <span>+0.5 ETH</span>
          </button>
        </div>
      </div>
    </header>
  );
};
