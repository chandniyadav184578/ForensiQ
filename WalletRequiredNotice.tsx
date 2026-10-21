import React from 'react';
import { ethers } from 'ethers';
import { useOrbit } from '../context/OrbitContext';
import { MetaMaskLogo } from './MetaMaskLogo';

/** Shown inside blockchain actions (register / transfer) only when the contract is configured but the wallet is not ready. */
export const WalletRequiredNotice: React.FC = () => {
  const { contractAddress, walletStatus, isMetaMaskInjected, chainId } = useOrbit();
  const needsChain = Boolean(contractAddress && ethers.isAddress(contractAddress));
  if (!needsChain || walletStatus === 'connected') return null;

  const message =
    !isMetaMaskInjected
      ? 'This action is recorded on Ethereum Sepolia and needs MetaMask. Install MetaMask, then reload.'
      : walletStatus === 'wrong_network'
        ? `MetaMask is on chain ${chainId ?? '?'}. Switch to Ethereum Sepolia (11155111) to continue.`
        : 'This action is recorded on Ethereum Sepolia. Connect MetaMask to continue.';

  return (
    <div role="status" className="flex items-start gap-2 p-3 rounded-xl text-xs text-amber-200 bg-amber-500/10 border border-amber-500/30">
      <MetaMaskLogo className="w-4 h-4 shrink-0 mt-0.5" />
      <span className="leading-relaxed flex-1">{message}</span>
      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent('orbit:open-wallet'))}
        className="shrink-0 font-bold underline text-amber-100 hover:text-white cursor-pointer"
      >
        {isMetaMaskInjected ? 'Open wallet' : 'Details'}
      </button>
    </div>
  );
};
