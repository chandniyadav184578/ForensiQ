import React, { useState } from 'react';
import { useOrbit } from '../context/OrbitContext';
import { truncateAddress } from '../utils/crypto';
import {
  Search,
  Plus,
  ShieldCheck,
  AlertTriangle,
  QrCode,
  ArrowUpRight,
  Filter,
  CheckCircle2,
  Clock,
  Coins,
  Cpu,
  ShieldAlert,
  ExternalLink,
  LoaderCircle,
  X,
} from 'lucide-react';

interface DashboardViewProps {
  onSelectObject: (objectId: string) => void;
  onOpenRegister: () => void;
  onOpenTagModal: (objectId: string) => void;
  onOpenTransferModal: (objectId: string) => void;
  onOpenLostModal: (objectId: string) => void;
  onOpenIntelligence: (objectId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onSelectObject,
  onOpenRegister,
  onOpenTagModal,
  onOpenTransferModal,
  onOpenLostModal,
  onOpenIntelligence,
}) => {
  const { objects, currentWallet } = useOrbit();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'LOST' | 'CLAIM_PENDING' | 'RECOVERED'>('ALL');
  const [onlyMyObjects, setOnlyMyObjects] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const filteredObjects = objects.filter(obj => {
    // Search query
    const matchesSearch =
      obj.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      obj.orbitId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      obj.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      obj.brand.toLowerCase().includes(searchQuery.toLowerCase());

    // Status
    const matchesStatus = statusFilter === 'ALL' || obj.status === statusFilter;

    // My objects
    const matchesOwnership = !onlyMyObjects || obj.currentOwnerAddress.toLowerCase() === currentWallet.address.toLowerCase();

    // Category
    const matchesCategory = categoryFilter === 'ALL' || obj.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesOwnership && matchesCategory;
  });

  const totalRegistered = objects.length;
  const lostCount = objects.filter(o => o.status === 'LOST' || o.status === 'CLAIM_PENDING').length;
  const totalEscrow = objects
    .reduce((acc, curr) => acc + (curr.escrowLocked ? parseFloat(curr.recoveryRewardEth) || 0 : 0), 0)
    .toFixed(3);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'LOST':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-400">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            <span>LOST (Bounty Active)</span>
          </span>
        );
      case 'CLAIM_PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
            <span>Claim Pending</span>
          </span>
        );
      case 'RECOVERED':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Recovered</span>
          </span>
        );
      case 'ACTIVE':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-pink-300">
            <span className="w-1.5 h-1.5 rounded-full bg-pink-400" />
            <span>Active Passport</span>
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-pink-500/20">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Registered Physical Passports
          </h1>
          <p className="text-xs sm:text-sm text-pink-200/70 mt-1">
            Verified hardware objects linked to immutable smart contract passports and escrow bounties.
          </p>
        </div>

        <button
          onClick={onOpenRegister}
          className="flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white bg-gradient-to-r from-[#d94680] to-[#be2b65] hover:from-[#e0528c] hover:to-[#cb3272] rounded-full transition-all shadow-lg shadow-pink-700/30 border border-pink-400/30 whitespace-nowrap cursor-pointer active:scale-95"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Register New Object</span>
        </button>
      </div>

      {/* Owner Alert: When someone reports finding an object */}
      {objects.some(o => o.status === 'CLAIM_PENDING') && (
        <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/60 shadow-xl space-y-2 backdrop-blur-md">
          {objects
            .filter(o => o.status === 'CLAIM_PENDING')
            .map(claimedObj => (
              <div
                key={claimedObj.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-amber-300">
                      Someone has reported finding {claimedObj.orbitId} ({claimedObj.name})!
                    </div>
                    <div className="text-[11px] text-slate-300">
                      A recovery claim was submitted with note: "{claimedObj.activeClaim?.finderNotes || 'I found this object.'}". Escrow bounty ready for release.
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onSelectObject(claimedObj.id)}
                  className="px-4 py-1.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
                >
                  Review Recovery Claim & Handover →
                </button>
              </div>
            ))}
        </div>
      )}

      {/* Metrics Row (Midnight plum cards with rose accents) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-[#180622]/85 border border-pink-500/20 rounded-2xl backdrop-blur-md shadow-lg shadow-black/40">
          <div className="text-xs text-pink-200/70 font-medium">Total Registered</div>
          <div className="text-2xl font-bold font-mono text-white tabular-nums mt-1">
            {totalRegistered}
          </div>
          <div className="text-[11px] text-pink-300/60 mt-0.5">On-chain digital IDs</div>
        </div>

        <div className="p-4 bg-[#180622]/85 border border-pink-500/20 rounded-2xl backdrop-blur-md shadow-lg shadow-black/40">
          <div className="text-xs text-pink-200/70 font-medium">Lost & Missing Alerts</div>
          <div className="text-2xl font-bold font-mono text-rose-400 tabular-nums mt-1">
            {lostCount}
          </div>
          <div className="text-[11px] text-rose-300/60 mt-0.5">Awaiting finder recovery</div>
        </div>

        <div className="p-4 bg-[#180622]/85 border border-pink-500/20 rounded-2xl backdrop-blur-md shadow-lg shadow-black/40">
          <div className="text-xs text-pink-200/70 font-medium">Locked Escrow Bounties</div>
          <div className="text-2xl font-bold font-mono text-pink-300 tabular-nums mt-1">
            {totalEscrow} ETH
          </div>
          <div className="text-[11px] text-pink-300/60 mt-0.5">Held in recovery contract</div>
        </div>

        <div className="p-4 bg-[#180622]/85 border border-pink-500/20 rounded-2xl backdrop-blur-md shadow-lg shadow-black/40">
          <div className="text-xs text-pink-200/70 font-medium">Your Custody</div>
          <div className="text-2xl font-bold font-mono text-emerald-400 tabular-nums mt-1">
            {objects.filter(o => o.currentOwnerAddress.toLowerCase() === currentWallet.address.toLowerCase()).length}
          </div>
          <div className="text-[11px] text-emerald-300/60 mt-0.5">Under {currentWallet.name}</div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-pink-300/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by object name, model, serial number, or ID (e.g. #7821)..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#180622]/90 border border-pink-500/20 rounded-xl text-xs sm:text-sm text-white placeholder-pink-300/40 focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-500/30 transition-all backdrop-blur-md"
            />
          </div>

          {/* Ownership Toggle */}
          <button
            onClick={() => setOnlyMyObjects(!onlyMyObjects)}
            className={`px-4 py-2.5 rounded-xl border text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              onlyMyObjects
                ? 'bg-pink-950/60 border-pink-500 text-pink-200 shadow-md shadow-pink-950'
                : 'bg-[#180622]/70 border-pink-500/20 text-pink-200/70 hover:text-white'
            }`}
          >
            {onlyMyObjects ? 'Showing: My Objects Only' : 'Filter: All Network Objects'}
          </button>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-[#180622]/80 border border-pink-500/20 rounded-xl overflow-x-auto backdrop-blur-md">
          {[
            { id: 'ALL', label: 'All Passports' },
            { id: 'ACTIVE', label: 'Active' },
            { id: 'LOST', label: 'Lost / Missing' },
            { id: 'CLAIM_PENDING', label: 'In Claim Handshake' },
            { id: 'RECOVERED', label: 'Recovered' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-[#330e3c] text-pink-200 font-bold border border-pink-500/40 shadow-sm'
                  : 'text-pink-200/60 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Passports Grid */}
      {filteredObjects.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-pink-500/30 rounded-3xl bg-[#180622]/30 space-y-3">
          <Cpu className="w-10 h-10 text-pink-400/50 mx-auto" />
          <h3 className="text-base font-bold text-white">No Objects Found</h3>
          <p className="text-xs text-pink-200/70 max-w-sm mx-auto">
            Try adjusting your search terms or filters, or register a new physical object passport.
          </p>
          <button
            onClick={onOpenRegister}
            className="mt-2 px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#d94680] to-[#be2b65] rounded-full hover:opacity-90 transition-opacity"
          >
            Register Object
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredObjects.map(obj => {
            const isOwner = obj.currentOwnerAddress.toLowerCase() === currentWallet.address.toLowerCase();

            return (
              <div
                key={obj.id}
                className="group bg-[#180622]/85 border border-pink-500/20 hover:border-pink-400/50 rounded-3xl overflow-hidden transition-all shadow-xl shadow-black/50 flex flex-col justify-between backdrop-blur-md hover:shadow-pink-950/30"
              >
                {/* Image and status overlay */}
                <div>
                  <div className="relative h-48 w-full bg-[#120419] overflow-hidden">
                    <img
                      src={obj.imageUrl}
                      alt={obj.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#180622] via-[#180622]/30 to-transparent" />

                    {/* Orbit ID Pill-less tag & Status */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                      <div className="px-2.5 py-1 bg-[#120419]/90 border border-pink-500/30 rounded-lg backdrop-blur-md text-[11px] font-mono font-bold text-pink-300">
                        {obj.orbitId}
                      </div>

                      <div className="px-2.5 py-1 bg-[#120419]/90 border border-pink-500/30 rounded-lg backdrop-blur-md">
                        {getStatusBadge(obj.status)}
                      </div>
                    </div>

                    {isOwner && (
                      <div className="absolute bottom-3 left-3 text-[10px] font-bold text-emerald-300 bg-[#120419]/90 border border-emerald-500/40 px-2 py-0.5 rounded backdrop-blur-sm">
                        You are Custodian
                      </div>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-3">
                    <div>
                      <div className="text-[11px] text-pink-300/70 font-medium">
                        {obj.brand} · {obj.category}
                      </div>
                      <h3 className="text-base font-bold text-white group-hover:text-pink-300 transition-colors line-clamp-1 mt-0.5">
                        {obj.name}
                      </h3>
                      <p className="text-xs text-pink-100/70 line-clamp-2 mt-1 leading-relaxed">
                        {obj.description}
                      </p>
                    </div>

                    {/* Hardware Serial & Owner */}
                    <div className="pt-2 border-t border-pink-500/20 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-pink-200/70">
                        <span>Hardware Serial:</span>
                        <span className="font-mono text-pink-100">{obj.serialNumber}</span>
                      </div>

                      <div className="flex items-center justify-between text-pink-200/70">
                        <span>Current Custody:</span>
                        <span className="font-mono text-pink-100">
                          {isOwner ? 'You (' + truncateAddress(obj.currentOwnerAddress) + ')' : obj.currentOwnerName}
                        </span>
                      </div>

                      {obj.status === 'LOST' && (
                        <div className="flex items-center justify-between text-rose-400 font-semibold pt-1">
                          <span>Escrow Reward:</span>
                          <span className="font-mono text-pink-300">{obj.recoveryRewardEth} ETH</span>
                        </div>
                      )}

                      {obj.status === 'CLAIM_PENDING' && (
                        <div className="p-2.5 bg-amber-950/50 border border-amber-500/50 rounded-lg text-xs space-y-1 mt-2">
                          <div className="flex items-center gap-1.5 font-bold text-amber-300">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                            <span>Someone reported finding this object!</span>
                          </div>
                          <div className="text-[11px] text-slate-300">
                            Claim note: "{obj.activeClaim?.finderNotes || 'I found this object.'}"
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Action Footer: View Timeline, Transfer, Mark Lost */}
                <div className="p-4 bg-[#14041c]/90 border-t border-pink-500/20 flex flex-col gap-2">
                  <button
                    onClick={() => onOpenIntelligence(obj.id)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-emerald-200 bg-emerald-950/35 hover:bg-emerald-900/45 border border-emerald-500/30 rounded-xl transition-colors cursor-pointer"
                  >
                    <ShieldAlert className="w-4 h-4" /> Open Intelligence Dashboard
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => onSelectObject(obj.id)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-black uppercase tracking-wider text-white bg-gradient-to-r from-[#d94680] to-[#be2b65] hover:from-[#e0528c] hover:to-[#cb3272] rounded-xl transition-all cursor-pointer shadow-md shadow-pink-900/30"
                    >
                      <span>Timeline</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => onOpenTagModal(obj.id)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-pink-200 bg-[#25082e] hover:bg-[#340b40] border border-pink-500/30 rounded-xl transition-colors cursor-pointer"
                      title="View QR Code"
                    >
                      <QrCode className="w-3.5 h-3.5 text-pink-400" />
                      <span>QR Tag</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-pink-500/10">
                    <button
                      onClick={() => onOpenTransferModal(obj.id)}
                      className="flex-1 py-1.5 text-[11px] font-semibold text-pink-200/80 hover:text-white bg-[#1a0524] hover:bg-[#280836] border border-pink-500/20 rounded-lg transition-colors cursor-pointer text-center"
                    >
                      Transfer
                    </button>

                    {obj.status === 'LOST' ? (
                      <button
                        onClick={() => onSelectObject(obj.id)}
                        className="flex-1 py-1.5 text-[11px] font-bold text-rose-400 bg-rose-950/40 border border-rose-900/60 rounded-lg transition-colors text-center"
                      >
                        LOST (Active)
                      </button>
                    ) : (
                      <button
                        onClick={() => onOpenLostModal(obj.id)}
                        className="flex-1 py-1.5 text-[11px] font-semibold text-rose-300 hover:text-rose-200 bg-rose-950/30 hover:bg-rose-900/50 border border-rose-900/50 rounded-lg transition-colors cursor-pointer text-center"
                      >
                        Mark Lost
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
