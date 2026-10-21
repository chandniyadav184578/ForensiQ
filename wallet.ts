import { BrowserProvider, JsonRpcProvider, Network, ethers } from 'ethers';

export const SEPOLIA_CHAIN_ID = 11155111;
export const SEPOLIA_HEX_CHAIN_ID = '0xaa36a7';
export const SEPOLIA_EXPLORER = 'https://sepolia.etherscan.io';
export const DEFAULT_SEPOLIA_RPC =
  (import.meta as any).env?.VITE_SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';

export const txUrl = (hash: string) => `${SEPOLIA_EXPLORER}/tx/${hash}`;
export const addressUrl = (addr: string) => `${SEPOLIA_EXPLORER}/address/${addr}`;

export interface WalletState {
  address: string;
  chainId: number;
  isSepolia: boolean;
  provider: BrowserProvider;
}

export type EthereumProvider = {
  isMetaMask?: boolean;
  isBraveWallet?: boolean;
  isCoinbaseWallet?: boolean;
  isPhantom?: boolean;
  isRabby?: boolean;
  isTrust?: boolean;
  providers?: EthereumProvider[];
  request: (args: { method: string; params?: unknown[] | object }) => Promise<any>;
  on?: (event: string, handler: (...args: any[]) => void) => void;
  removeListener?: (event: string, handler: (...args: any[]) => void) => void;
};

/* ------------------------------------------------------------------ */
/* Structured errors so the UI can tell failure causes apart           */
/* ------------------------------------------------------------------ */
export type OrbitErrorKind =
  | 'METAMASK_NOT_DETECTED'
  | 'WALLET_NOT_CONNECTED'
  | 'WALLET_LOCKED'
  | 'USER_REJECTED'
  | 'REQUEST_PENDING'
  | 'WRONG_NETWORK'
  | 'RPC_UNAVAILABLE'
  | 'CONTRACT_ADDRESS_MISSING'
  | 'CONTRACT_ADDRESS_INVALID'
  | 'CONTRACT_NOT_DEPLOYED'
  | 'ABI_MISMATCH'
  | 'INSUFFICIENT_FUNDS'
  | 'TX_REVERTED'
  | 'SIGNER_MISMATCH'
  | 'METAMASK_EXTENSION_ERROR'
  | 'FIREBASE_FAILURE'
  | 'UNKNOWN';

export class OrbitError extends Error {
  kind: OrbitErrorKind;
  txHash?: string;
  constructor(kind: OrbitErrorKind, message: string, txHash?: string) {
    super(message);
    this.name = 'OrbitError';
    this.kind = kind;
    this.txHash = txHash;
  }
}

/** Dev-only diagnostics. Never log keys, seed phrases or user PII. */
export function orbitDebug(scope: string, info: Record<string, unknown> = {}) {
  if ((import.meta as any).env?.DEV) {
    // eslint-disable-next-line no-console
    console.debug(`[ORBIT:${scope}]`, info);
  }
}

/** Convert any ethers / MetaMask / RPC error into an OrbitError with a clear message. */
export function classifyError(error: any, context = 'Operation'): OrbitError {
  if (error instanceof OrbitError) return error;
  const code = error?.code;
  const nested = error?.info?.error?.code ?? error?.error?.code;
  const raw = String(error?.shortMessage || error?.reason || error?.message || error || 'Unknown error');

  // MetaMask's own background script failed (not ORBIT code): see BLOCKCHAIN_SETUP.md.
  if (/reading 'origin'|reading "origin"|\.origin\b.*undefined/i.test(raw)) {
    return new OrbitError(
      'METAMASK_EXTENSION_ERROR',
      "MetaMask's extension reported an internal error (\"reading 'origin'\"). This comes from the extension, not ORBIT. Open ORBIT in a normal Chrome tab at http://localhost:3000 (not an embedded/preview browser), reload the page, lock and unlock MetaMask or reload the extension at chrome://extensions, and disable other wallet extensions."
    );
  }
  if (code === 4001 || code === 'ACTION_REJECTED' || /user rejected|rejected by user|user denied/i.test(raw)) {
    return new OrbitError('USER_REJECTED', `${context} was rejected in MetaMask. Approve the request to continue.`);
  }
  if (code === -32002 || nested === -32002 || /already pending/i.test(raw)) {
    return new OrbitError('REQUEST_PENDING', 'A MetaMask request is already pending. Open the MetaMask extension and finish it first.');
  }
  if (code === 'INSUFFICIENT_FUNDS' || /insufficient funds|exceeds balance/i.test(raw)) {
    return new OrbitError('INSUFFICIENT_FUNDS', 'Not enough Sepolia test ETH to cover the value plus gas. Get test ETH from a Sepolia faucet.');
  }
  if (code === 'CALL_EXCEPTION' || /execution reverted|revert/i.test(raw)) {
    const reason = error?.reason || (raw.match(/reverted(?: with reason string)? ['"]?([^'"]+)['"]?/i)?.[1]) || raw;
    return new OrbitError('TX_REVERTED', `Transaction reverted: ${reason}`, error?.receipt?.hash || error?.transaction?.hash);
  }
  if (code === 'NETWORK_ERROR' || code === 'SERVER_ERROR' || code === 'TIMEOUT' || /failed to fetch|network error|could not detect network|timeout|ECONN|429|rate limit/i.test(raw)) {
    return new OrbitError('RPC_UNAVAILABLE', `Sepolia RPC is unavailable (${DEFAULT_SEPOLIA_RPC}). Try again or set VITE_SEPOLIA_RPC_URL to a working endpoint.`);
  }
  if (code === -32603 && /locked|unlock/i.test(raw)) {
    return new OrbitError('WALLET_LOCKED', 'MetaMask is locked. Unlock it and try again.');
  }
  return new OrbitError('UNKNOWN', `${context} failed: ${raw}`);
}

/* ------------------------------------------------------------------ */
/* Provider detection (EIP-6963 first, then legacy fallbacks)          */
/* ------------------------------------------------------------------ */
const discovered = new Map<string, { rdns: string; provider: EthereumProvider }>();
let discoveryStarted = false;
const discoveryListeners = new Set<() => void>();

/** Starts EIP-6963 discovery once. Safe to call repeatedly. */
export function startProviderDiscovery(): void {
  if (typeof window === 'undefined' || discoveryStarted) return;
  discoveryStarted = true;
  window.addEventListener('eip6963:announceProvider', (event: any) => {
    const detail = event?.detail;
    if (!detail?.info?.rdns || !detail?.provider) return;
    discovered.set(detail.info.uuid || detail.info.rdns, { rdns: detail.info.rdns, provider: detail.provider });
    discoveryListeners.forEach(fn => fn());
  });
  window.dispatchEvent(new Event('eip6963:requestProvider'));
}

/** Subscribe to late wallet injection. Returns an unsubscribe function. */
export function onProviderDiscovered(fn: () => void): () => void {
  discoveryListeners.add(fn);
  return () => discoveryListeners.delete(fn);
}

const isRealMetaMask = (p?: EthereumProvider) =>
  Boolean(p?.isMetaMask && !p.isBraveWallet && !p.isPhantom && !p.isRabby && !p.isTrust && !p.isCoinbaseWallet);

/**
 * Returns the MetaMask provider even when several wallets are injected.
 * Order: EIP-6963 (io.metamask) -> window.ethereum.providers[] -> window.ethereum.
 */
export function getEthereum(): EthereumProvider | null {
  if (typeof window === 'undefined') return null;
  startProviderDiscovery();

  for (const { rdns, provider } of discovered.values()) {
    if (rdns === 'io.metamask' || rdns === 'io.metamask.flask') return provider;
  }

  const injected = (window as any).ethereum as EthereumProvider | undefined;
  if (!injected) return null;

  if (Array.isArray(injected.providers)) {
    const mm = injected.providers.find(isRealMetaMask) || injected.providers.find(p => p?.isMetaMask);
    if (mm) return mm;
  }
  // Brave Wallet and others may set isMetaMask; accept as a last resort only if it is the sole provider.
  return injected.isMetaMask ? injected : null;
}

export function isMetaMaskInstalled(): boolean {
  return Boolean(getEthereum());
}

export const METAMASK_INSTALL_HELP =
  'MetaMask was not detected. Install the MetaMask extension from metamask.io, enable it for this site (and for localhost), then reload ORBIT. If other wallet extensions are installed, set MetaMask as the default wallet or disable the others.';

function requireEthereum(): EthereumProvider {
  const eth = getEthereum();
  if (!eth) throw new OrbitError('METAMASK_NOT_DETECTED', METAMASK_INSTALL_HELP);
  return eth;
}

/** Always build a fresh BrowserProvider: ethers v6 caches the network and throws after a chain switch. */
export function freshBrowserProvider(): BrowserProvider {
  return new BrowserProvider(requireEthereum() as any, 'any');
}

/** Read-only RPC provider, independent of MetaMask and of the wallet's current chain. */
let rpcProvider: JsonRpcProvider | null = null;
export function getReadOnlyProvider(): JsonRpcProvider {
  if (!rpcProvider) {
    rpcProvider = new JsonRpcProvider(DEFAULT_SEPOLIA_RPC, SEPOLIA_CHAIN_ID, {
      staticNetwork: Network.from(SEPOLIA_CHAIN_ID),
    });
  }
  return rpcProvider;
}

async function readChainId(eth: EthereumProvider): Promise<number> {
  const hex = await eth.request({ method: 'eth_chainId' });
  return parseInt(hex, 16);
}

async function buildState(eth: EthereumProvider, address: string): Promise<WalletState> {
  const chainId = await readChainId(eth);
  return {
    address: ethers.getAddress(address),
    chainId,
    isSepolia: chainId === SEPOLIA_CHAIN_ID,
    provider: freshBrowserProvider(),
  };
}

/* ------------------------------------------------------------------ */
/* Connect / read state                                                */
/* ------------------------------------------------------------------ */

/** Prompts MetaMask for account access. Call ONLY from a user click. Does not throw on wrong network. */
export async function connectWallet(): Promise<WalletState> {
  const eth = requireEthereum();
  let accounts: string[];
  try {
    accounts = await eth.request({ method: 'eth_requestAccounts' });
  } catch (error) {
    throw classifyError(error, 'MetaMask connection');
  }
  if (!Array.isArray(accounts) || accounts.length === 0) {
    throw new OrbitError('WALLET_LOCKED', 'MetaMask returned no account. Unlock MetaMask and approve ORBIT.');
  }
  try {
    return await buildState(eth, accounts[0]);
  } catch (error) {
    throw classifyError(error, 'Reading MetaMask network');
  }
}

/** Silent read (no popup). Returns null when not previously authorised or locked. */
export async function getConnectedWallet(): Promise<WalletState | null> {
  const eth = getEthereum();
  if (!eth) return null;
  try {
    const accounts: string[] = await eth.request({ method: 'eth_accounts' });
    if (!Array.isArray(accounts) || accounts.length === 0) return null;
    return await buildState(eth, accounts[0]);
  } catch (error) {
    orbitDebug('getConnectedWallet', { message: String((error as any)?.message || error) });
    return null;
  }
}

/** Balance of an address on Sepolia, via read-only RPC (never the wallet's possibly-wrong chain). */
export async function getWalletBalance(address: string): Promise<string> {
  try {
    return ethers.formatEther(await getReadOnlyProvider().getBalance(address));
  } catch (error) {
    orbitDebug('getWalletBalance', { message: String((error as any)?.message || error) });
    return '0.0000';
  }
}

/* ------------------------------------------------------------------ */
/* Network switching (call only from a user action)                    */
/* ------------------------------------------------------------------ */
export async function switchToSepolia(): Promise<void> {
  const eth = requireEthereum();
  try {
    await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: SEPOLIA_HEX_CHAIN_ID }] });
  } catch (switchError: any) {
    const code = switchError?.code ?? switchError?.data?.originalError?.code;
    if (code === 4902 || /unrecognized chain|not been added/i.test(String(switchError?.message || ''))) {
      try {
        await eth.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: SEPOLIA_HEX_CHAIN_ID,
            chainName: 'Ethereum Sepolia Testnet',
            nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
            rpcUrls: ['https://ethereum-sepolia-rpc.publicnode.com'],
            blockExplorerUrls: [SEPOLIA_EXPLORER],
          }],
        });
      } catch (addError) {
        throw classifyError(addError, 'Adding Sepolia');
      }
    } else {
      throw classifyError(switchError, 'Switching to Sepolia');
    }
  }
  // Verify: never assume the switch succeeded.
  if ((await readChainId(eth)) !== SEPOLIA_CHAIN_ID) {
    throw new OrbitError('WRONG_NETWORK', 'MetaMask is still not on Ethereum Sepolia (chain ID 11155111). Switch the network in MetaMask.');
  }
}

/* ------------------------------------------------------------------ */
/* Events                                                              */
/* ------------------------------------------------------------------ */
export interface WalletEventHandlers {
  onAccountsChanged: (accounts: string[]) => void;
  onChainChanged: (chainId: number) => void;
  onDisconnect?: () => void;
}

/** Subscribes to the MetaMask provider. Returns an unsubscribe that removes every listener it added. */
export function subscribeWalletEvents(handlers: WalletEventHandlers): () => void {
  const eth = getEthereum();
  if (!eth?.on) return () => {};
  const accounts = (a: string[]) => handlers.onAccountsChanged(a || []);
  const chain = (hex: string) => handlers.onChainChanged(parseInt(hex, 16));
  const disconnect = () => handlers.onDisconnect?.();
  eth.on('accountsChanged', accounts);
  eth.on('chainChanged', chain);
  eth.on('disconnect', disconnect);
  return () => {
    eth.removeListener?.('accountsChanged', accounts);
    eth.removeListener?.('chainChanged', chain);
    eth.removeListener?.('disconnect', disconnect);
  };
}

/* ------------------------------------------------------------------ */
/* Contract preflight                                                  */
/* ------------------------------------------------------------------ */
export function validateContractAddress(address: string | undefined, label: string): string {
  if (!address) {
    throw new OrbitError('CONTRACT_ADDRESS_MISSING', `${label} address is not configured. Set it in .env (see BLOCKCHAIN_SETUP.md) and restart the dev server.`);
  }
  if (!ethers.isAddress(address) || address === ethers.ZeroAddress) {
    throw new OrbitError('CONTRACT_ADDRESS_INVALID', `${label} address "${address}" is not a valid Ethereum address.`);
  }
  return ethers.getAddress(address);
}

const preflightCache = new Map<string, boolean>();

/**
 * Confirms code exists at the address on Sepolia and that a known view function answers,
 * which catches wrong-network addresses and ABI mismatches before the user signs anything.
 */
export async function assertDeployed(
  address: string,
  label: string,
  probe: (provider: JsonRpcProvider) => Promise<unknown>
): Promise<void> {
  if (preflightCache.get(address)) return;
  const provider = getReadOnlyProvider();
  let code: string;
  try {
    code = await provider.getCode(address);
  } catch (e) {
    throw classifyError(e, `Checking ${label}`);
  }
  if (!code || code === '0x') {
    throw new OrbitError('CONTRACT_NOT_DEPLOYED', `No contract code at ${address} on Sepolia. ${label} is not deployed there (wrong address or wrong network).`);
  }
  try {
    await probe(provider);
  } catch (e: any) {
    if (e?.code === 'CALL_EXCEPTION' || e?.code === 'BAD_DATA') {
      throw new OrbitError('ABI_MISMATCH', `${label} at ${address} does not answer the expected ORBIT interface. Redeploy or update the ABI artifact.`);
    }
    throw classifyError(e, `Probing ${label}`);
  }
  preflightCache.set(address, true);
}

/** Returns the signer-capable provider only if MetaMask is connected, authorised and on Sepolia. */
export async function getReadySigner(expectedAddress?: string) {
  const eth = requireEthereum();
  const accounts: string[] = await eth.request({ method: 'eth_accounts' }).catch((e: any) => { throw classifyError(e); });
  if (!accounts?.length) {
    throw new OrbitError('WALLET_NOT_CONNECTED', 'MetaMask is not connected. Open the wallet menu and press "Connect MetaMask Account" first.');
  }
  const chainId = await readChainId(eth);
  if (chainId !== SEPOLIA_CHAIN_ID) {
    throw new OrbitError('WRONG_NETWORK', `MetaMask is on chain ${chainId}. Switch to Ethereum Sepolia (11155111) before sending transactions.`);
  }
  const provider = freshBrowserProvider();
  const signer = await provider.getSigner(accounts[0]);
  const address = await signer.getAddress();
  if (expectedAddress && ethers.isAddress(expectedAddress) && expectedAddress.toLowerCase() !== address.toLowerCase()) {
    throw new OrbitError(
      'SIGNER_MISMATCH',
      `ORBIT is acting as ${expectedAddress.slice(0, 6)}…${expectedAddress.slice(-4)} but MetaMask's active account is ${address.slice(0, 6)}…${address.slice(-4)}. Select the matching account in MetaMask or reconnect.`
    );
  }
  return { signer, address, chainId, provider };
}
