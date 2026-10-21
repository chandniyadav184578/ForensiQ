import React, { useState, useEffect } from 'react';
import { truncateAddress } from '../utils/crypto';
import { computePassportHash } from '../utils/passportHashing';
import { passportContractService, ORBIT_NETWORK_NAME, ORBIT_SEPOLIA_CHAIN_ID } from '../blockchain/passportContractService';
import { escrowContractService, EscrowBountyDetails } from '../blockchain/escrowContractService';
import { assetService } from '../services/assetService';
import { PhysicalObject } from '../types/orbit';
import {
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
  Lock,
  Coins,
  Cpu,
  Clock,
  ArrowRight,
  Printer,
  Copy,
  Check,
  Globe,
  Share2,
} from 'lucide-react';

interface PublicVerificationViewProps {
  initialContractAddress?: string;
  initialTokenId?: number;
  onBackToApp?: () => void;
}

export const PublicVerificationView: React.FC<PublicVerificationViewProps> = ({
  initialContractAddress,
  initialTokenId,
  onBackToApp,
}) => {
  // Never silently query a hardcoded address/token pair: a valid public
  // verification requires the actual deployed contract and a minted token ID.
  const [contractAddress, setContractAddress] = useState<string>(
    initialContractAddress || passportContractService.getContractAddress() || ''
  );
  const [tokenId, setTokenId] = useState<number>(initialTokenId ?? 1);
  const [inputContract, setInputContract] = useState(contractAddress);
  const [inputTokenId, setInputTokenId] = useState(String(tokenId));

  const [loading, setLoading] = useState<boolean>(Boolean(initialContractAddress || passportContractService.getContractAddress()));
  const [onChainData, setOnChainData] = useState<any>(null);
  const [escrowBounty, setEscrowBounty] = useState<EscrowBountyDetails | null>(null);
  const [matchingObject, setMatchingObject] = useState<PhysicalObject | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);

  const fetchVerificationData = async (targetContract: string, targetToken: number) => {
    setLoading(true);
    setOnChainData(null);
    setEscrowBounty(null);
    setMatchingObject(null);

    try {
      // 1. Direct on-chain query to Sepolia (No login / No wallet required)
      const passportQuery = await passportContractService.queryPublicPassportDirectly(
        targetContract,
        targetToken
      );
      setOnChainData(passportQuery);

      // 2. Query Escrow status for this token if available
      try {
        const bounty = await escrowContractService.getOnChainBounty(targetToken);
        setEscrowBounty(bounty);
      } catch {
        // Escrow query optional
      }

      // 3. Look up matching object mirror in Firestore (if available for metadata comparison)
      try {
        const allAssets = await assetService.getAllAssets();
        const found = allAssets.find(
          (a: PhysicalObject) =>
            a.tokenId === targetToken ||
            (passportQuery.assetId && a.id === passportQuery.assetId) ||
            (passportQuery.assetId && a.orbitId === passportQuery.assetId)
        );
        if (found) {
          setMatchingObject(found);
        }
      } catch {
        // Local/read mirror optional
      }
    } catch (err: any) {
      console.error('Public verification error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (contractAddress && tokenId > 0) {
      fetchVerificationData(contractAddress, tokenId);
    } else {
      setLoading(false);
      setOnChainData(null);
    }
  }, [contractAddress, tokenId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAddr = inputContract.trim();
    const parsedId = parseInt(inputTokenId.trim(), 10);
    if (cleanAddr && !isNaN(parsedId)) {
      setContractAddress(cleanAddr);
      setTokenId(parsedId);
      // Update browser URL without reloading
      if (typeof window !== 'undefined' && window.history?.pushState) {
        const newUrl = `/verify/${cleanAddr}/${parsedId}`;
        window.history.pushState({ contract: cleanAddr, token: parsedId }, '', newUrl);
      }
    }
  };

  const expectedLocalHash = matchingObject ? computePassportHash(matchingObject).toLowerCase() : null;
  const onChainPassportHash = onChainData?.passportHash?.toLowerCase() || '';

  const isHashExactMatch =
    Boolean(expectedLocalHash && onChainPassportHash && expectedLocalHash === onChainPassportHash);

  const isTokenFound = Boolean(onChainData?.success && onChainData?.owner);

  const handleCopyVerificationUrl = () => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/verify/${contractAddress}/${tokenId}`;
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8 selection:bg-cyan-500/20 selection:text-cyan-300">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Navigation / Header Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-pink-500 p-0.5 shadow-lg shadow-cyan-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-white">ORBIT PROTOCOL</h1>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-cyan-950 border border-cyan-800 text-cyan-300 rounded">
                  Sepolia Node Read-Only
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Independent Public Blockchain Verification · Zero Auth / Direct RPC
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onBackToApp && (
              <button
                onClick={onBackToApp}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                ← Back to App
              </button>
            )}
            <button
              onClick={handleCopyVerificationUrl}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-cyan-300 bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-700/60 rounded-lg transition-colors cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Link Copied!' : 'Share URL'}</span>
            </button>
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Print Proof Certificate"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Live Lookup Search Bar */}
        <form
          onSubmit={handleSearchSubmit}
          className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl flex flex-col md:flex-row items-center gap-3"
        >
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 shrink-0">
            <Search className="w-4 h-4 text-cyan-400" />
            <span>Verify Token:</span>
          </div>

          <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              type="text"
              placeholder="Contract 0x..."
              value={inputContract}
              onChange={e => setInputContract(e.target.value)}
              className="sm:col-span-2 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-cyan-300 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
            />
            <input
              type="number"
              min="1"
              placeholder="Token ID"
              value={inputTokenId}
              onChange={e => setInputTokenId(e.target.value)}
              className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-cyan-300 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full md:w-auto px-5 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-cyan-300 hover:from-cyan-300 hover:to-cyan-200 rounded-lg transition-all shadow-md shadow-cyan-500/20 cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Querying Sepolia...' : 'Query Blockchain'}
          </button>
        </form>

        {/* Verification Status Banner */}
        {loading ? (
          <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3">
            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
            <h3 className="text-base font-bold text-white">Directly Reading Ethereum Sepolia...</h3>
            <p className="text-xs text-slate-400">
              Querying smart contract at {truncateAddress(contractAddress, 8, 6)} for Token #{tokenId}.
            </p>
          </div>
        ) : !contractAddress ? (
          <div className="p-10 text-center bg-slate-900/80 border border-amber-400/30 rounded-2xl space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-300 mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">Passport contract not configured</h3>
              <p className="text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
                ORBIT has no deployed Passport contract address configured, so it cannot query Sepolia yet. Enter the actual deployed ORBIT Passport contract address above, along with a token ID that has been minted on that contract.
              </p>
            </div>
            <p className="text-xs text-slate-500">Demo objects stored in the app are not automatically on-chain tokens.</p>
          </div>
        ) : isTokenFound ? (
          <div className="space-y-6">
            {/* Primary Verified Verdict Banner */}
            <div
              className={`p-6 rounded-2xl border shadow-2xl relative overflow-hidden ${
                isHashExactMatch || !expectedLocalHash
                  ? 'bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 border-emerald-500/50 shadow-emerald-950/40'
                  : 'bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 border-amber-500/50 shadow-amber-950/40'
              }`}
            >
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border ${
                      isHashExactMatch || !expectedLocalHash
                        ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-400'
                        : 'bg-amber-500/20 border-amber-400/40 text-amber-400'
                    }`}
                  >
                    {isHashExactMatch || !expectedLocalHash ? (
                      <CheckCircle2 className="w-8 h-8" />
                    ) : (
                      <AlertTriangle className="w-8 h-8" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          isHashExactMatch || !expectedLocalHash
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {isHashExactMatch || !expectedLocalHash
                          ? '✓ VERIFIED ON-CHAIN'
                          : '⚠ HASH COMMITMENT MISMATCH'}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        Chain ID: {ORBIT_SEPOLIA_CHAIN_ID}
                      </span>
                    </div>

                    <h2 className="text-2xl font-black text-white mt-1">
                      {matchingObject ? matchingObject.name : `ORBIT Object #${tokenId}`}
                    </h2>
                    <p className="text-xs text-slate-300 mt-0.5">
                      {isHashExactMatch
                        ? 'Authentic cryptographic digital object passport verified directly against Ethereum Sepolia.'
                        : 'Token exists on Sepolia, but local passport payload differs from on-chain commitment.'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-start md:items-end gap-1.5 shrink-0">
                  <a
                    href={onChainData.explorerUrls.tokenUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 px-4 py-2 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors shadow-md shadow-cyan-500/20"
                  >
                    <span>View Token on Etherscan</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Token #{tokenId} · Sepolia Testnet
                  </span>
                </div>
              </div>
            </div>

            {/* Core Blockchain Verification Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Box 1: On-Chain Blockchain Identity */}
              <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                      Authoritative On-Chain Record
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-cyan-300">Ethereum Sepolia</span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Current On-Chain Owner (ERC-721):</span>
                    <div className="flex items-center justify-between p-2.5 bg-slate-950 border border-slate-800/80 rounded-lg font-mono">
                      <span className="text-cyan-300 truncate">{onChainData.owner}</span>
                      <a
                        href={onChainData.explorerUrls.ownerUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-400 hover:text-white shrink-0 ml-2"
                        title="View Owner on Etherscan"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-0.5">Authoritative Passport Hash (Keccak-256):</span>
                    <div className="flex items-center justify-between p-2.5 bg-slate-950 border border-slate-800/80 rounded-lg font-mono text-[11px]">
                      <span className="text-pink-300 truncate">{onChainPassportHash}</span>
                      <button
                        onClick={() => handleCopyHash(onChainPassportHash)}
                        className="text-slate-400 hover:text-white shrink-0 ml-2 cursor-pointer"
                        title="Copy Hash"
                      >
                        {copiedHash ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="p-2.5 bg-slate-950 border border-slate-800/80 rounded-lg">
                      <span className="text-[10px] text-slate-500 block uppercase">Lifecycle Status</span>
                      <span className="font-bold text-emerald-400 font-mono">
                        {onChainData.objectStatus || 'ACTIVE'}
                      </span>
                    </div>

                    <div className="p-2.5 bg-slate-950 border border-slate-800/80 rounded-lg">
                      <span className="text-[10px] text-slate-500 block uppercase">ORBIT Asset ID</span>
                      <span className="font-bold text-cyan-300 font-mono truncate block">
                        {onChainData.assetId || matchingObject?.orbitId || `orbit-${tokenId}`}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 space-y-1.5 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Smart Contract:</span>
                      <a
                        href={onChainData.explorerUrls.contractUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-cyan-400 hover:underline flex items-center gap-1"
                      >
                        <span>{truncateAddress(contractAddress, 6, 6)}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    {onChainData.creationTimestamp && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Creation Timestamp:</span>
                        <span className="font-mono text-slate-300">
                          {new Date(onChainData.creationTimestamp).toLocaleString()}
                        </span>
                      </div>
                    )}

                    {onChainData.lastUpdated && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Last On-Chain Update:</span>
                        <span className="font-mono text-slate-300">
                          {new Date(onChainData.lastUpdated).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Box 2: Expected Physical Record vs. Cryptographic Match */}
              <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-pink-400" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                      Physical Object Integrity Seal
                    </h3>
                  </div>
                  <span
                    className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${
                      isHashExactMatch
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : 'bg-amber-950 text-amber-400 border border-amber-800'
                    }`}
                  >
                    {isHashExactMatch ? '100% MATCH' : 'AUDIT VERIFICATION'}
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  {matchingObject ? (
                    <>
                      <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-lg space-y-2">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Hardware Serial:</span>
                          <span className="font-mono font-bold text-cyan-300">
                            {matchingObject.serialNumber}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">SHA-256 Serial Seal:</span>
                          <span className="font-mono text-[10px] text-pink-300 truncate max-w-[200px]">
                            {matchingObject.serialHash || 'Verified on Registration'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Brand / Model:</span>
                          <span className="text-white font-medium">
                            {matchingObject.brand} {matchingObject.model}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Manufacture Year:</span>
                          <span className="text-slate-300 font-mono">{matchingObject.manufactureYear}</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-400 block mb-0.5">Calculated Canonical Hash:</span>
                        <div className="p-2.5 bg-slate-950 border border-slate-800/80 rounded-lg font-mono text-[11px] truncate text-slate-300">
                          {expectedLocalHash}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-2 text-slate-400">
                      <p className="leading-relaxed">
                        This token was directly retrieved from Ethereum Sepolia smart contract storage.
                      </p>
                      <p className="text-[11px] text-cyan-300">
                        Authoritative on-chain hash is permanently committed on-chain.
                      </p>
                    </div>
                  )}

                  {/* Hash Comparison Table */}
                  <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1.5 text-[11px]">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Cryptographic Primitive:</span>
                      <span className="font-mono text-white">Keccak-256 / SHA-256</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Verification Mode:</span>
                      <span className="font-mono text-cyan-300">Deterministic Direct Query</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Zero-Knowledge Privacy:</span>
                      <span className="font-mono text-emerald-400">No Owner PII Exposed ✓</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Escrow & Bounty Section if active */}
            {escrowBounty && (
              <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Coins className="w-5 h-5 text-amber-400" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                      Smart Escrow Recovery Status
                    </h3>
                  </div>
                  <span
                    className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded ${
                      escrowBounty.state === 'LOCKED'
                        ? 'bg-rose-950 text-rose-400 border border-rose-800'
                        : escrowBounty.state === 'RELEASED'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    ESCROW STATE: {escrowBounty.state}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                    <span className="text-slate-400 block mb-1">Locked Bounty Amount:</span>
                    <span className="text-lg font-black font-mono text-amber-300">
                      {escrowBounty.amountEth} ETH
                    </span>
                  </div>

                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                    <span className="text-slate-400 block mb-1">Locked At:</span>
                    <span className="font-mono text-slate-300">
                      {escrowBounty.lockedAt ? new Date(escrowBounty.lockedAt).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                    <span className="text-slate-400 block mb-1">Finder Status:</span>
                    <span className="font-mono text-cyan-300 truncate block">
                      {escrowBounty.finder !== '0x0000000000000000000000000000000000000000'
                        ? truncateAddress(escrowBounty.finder)
                        : 'Unassigned / Claim Pending'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* External Sepolia Explorer Actions */}
            <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Authoritative proofs are verifiable on Ethereum Sepolia block explorers.</span>
              </div>

              <div className="flex items-center gap-3">
                <a
                  href={onChainData.explorerUrls.contractUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <span>Contract</span>
                  <ExternalLink className="w-3 h-3" />
                </a>

                <a
                  href={onChainData.explorerUrls.tokenUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:text-cyan-200 bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-800 rounded-lg transition-colors"
                >
                  <span>Token #{tokenId}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        ) : (
          /* Error / Token Not Found State */
          <div className="p-10 text-center bg-slate-900/80 border border-rose-500/40 rounded-2xl space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
              <XCircle className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-bold text-white">Token could not be verified on Sepolia</h3>
              <p className="text-xs text-rose-300 max-w-md mx-auto leading-relaxed">
                Token #{tokenId} was not found at {truncateAddress(contractAddress, 8, 6)}, or the contract/RPC query failed. Confirm the contract address and token ID, then check the contract on Sepolia Etherscan.
              </p>
              {onChainData?.error && <p className="text-xs text-slate-400 max-w-md mx-auto break-words">Details: {onChainData.error}</p>}
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl max-w-lg mx-auto text-left text-xs font-mono space-y-1.5 text-slate-400">
              <div>• Verification Query: <span className="text-white">ownerOf({tokenId})</span></div>
              <div>• Chain ID: <span className="text-purple-300">11155111 (Sepolia)</span></div>
              <div>• Status: <span className="text-rose-400">NOT_VERIFIED</span></div>
            </div>

            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                onClick={() => fetchVerificationData(contractAddress, tokenId)}
                className="px-5 py-2 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors cursor-pointer"
              >
                Retry Query
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
