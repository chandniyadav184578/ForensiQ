import React, { useMemo, useState } from 'react';
import { useOrbit } from '../context/OrbitContext';
import { MarketplaceListing } from '../types/orbit';
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Eye,
  Gavel,
  Loader2,
  Search,
  SlidersHorizontal,
  ShieldCheck,
  Tag,
  X,
} from 'lucide-react';

interface MarketplaceViewProps {
  onSelectObject: (objectId: string) => void;
}

const CATEGORIES = ['ALL', 'Cameras & Optics', 'Watches & Luxury', 'Bicycles & Mobility', 'Computing & Laptops', 'Audio & Instruments', 'Hardware Gear'];

export const MarketplaceView: React.FC<MarketplaceViewProps> = ({ onSelectObject }) => {
  const {
    objects,
    currentWallet,
    marketplaceListings,
    listObjectForSale,
    cancelMarketplaceListing,
    purchaseMarketplaceListing,
  } = useOrbit();

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('ALL');
  const [listingObjectId, setListingObjectId] = useState('');
  const [price, setPrice] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const activeListings = marketplaceListings.filter(l => l.status === 'ACTIVE');
  const listedObjectIds = new Set(activeListings.map(l => l.objectId));

  const objectMap = useMemo(() => new Map(objects.map(o => [o.id, o])), [objects]);

  const filteredListings = activeListings.filter(listing => {
    const obj = objectMap.get(listing.objectId);
    if (!obj) return false;
    const haystack = `${obj.name} ${obj.brand} ${obj.model} ${obj.orbitId} ${obj.category}`.toLowerCase();
    return haystack.includes(query.toLowerCase()) && (category === 'ALL' || obj.category === category);
  });

  const mySellableObjects = objects.filter(obj =>
    obj.currentOwnerAddress.toLowerCase() === currentWallet.address.toLowerCase() &&
    (obj.status === 'ACTIVE' || obj.status === 'RECOVERED') &&
    !listedObjectIds.has(obj.id)
  );

  const handleList = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!listingObjectId || !price) {
      setMessage('Select an object and enter a resale price.');
      return;
    }
    try {
      setBusyId('listing');
      await listObjectForSale(listingObjectId, price);
      setListingObjectId('');
      setPrice('');
      setMessage('Object listed successfully. Its ORBIT Passport stays attached to the listing.');
    } catch (err: any) {
      setMessage(err.message || 'Unable to create listing.');
    } finally {
      setBusyId(null);
    }
  };

  const handlePurchase = async (listing: MarketplaceListing) => {
    setMessage(null);
    try {
      setBusyId(listing.id);
      await purchaseMarketplaceListing(listing.id);
      setMessage('Purchase complete. Ownership and the passport timeline have been updated.');
    } catch (err: any) {
      setMessage(err.message || 'Purchase failed.');
    } finally {
      setBusyId(null);
    }
  };

  const handleCancel = async (listing: MarketplaceListing) => {
    try {
      setBusyId(listing.id);
      await cancelMarketplaceListing(listing.id);
      setMessage('Listing cancelled.');
    } catch (err: any) {
      setMessage(err.message || 'Unable to cancel listing.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20">
      <div className="relative mb-8 overflow-hidden rounded-[28px] border border-pink-500/20 bg-gradient-to-br from-[#1c0718] via-[#100815] to-[#080711] p-5 sm:p-7 lg:p-8 shadow-2xl shadow-pink-950/20">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-pink-600/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-52 w-52 rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="relative flex flex-col xl:flex-row xl:items-end xl:justify-between gap-6">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-pink-400/30 bg-pink-950/50 px-3.5 py-2 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-[0.18em] text-pink-200 mb-4">
              <Gavel className="h-4 w-4" /> Verified resale protocol
              <span className="h-1 w-1 rounded-full bg-pink-300" /> Passport-backed listings
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white">ORBIT Resale Marketplace</h1>
            <p className="mt-3 max-w-2xl text-sm sm:text-base leading-7 text-slate-400">
              Good objects deserve a better second chapter. Explore verified cameras, tech, watches, mobility and more — with each ORBIT Passport travelling with the item.
            </p>
          </div>
          <div className="relative grid grid-cols-2 gap-3 xl:min-w-[300px]">
            <div className="rounded-2xl border border-pink-500/20 bg-black/30 p-4 backdrop-blur-sm">
              <div className="text-[10px] uppercase tracking-[0.16em] font-mono text-slate-500">Live listings</div>
              <div className="mt-1 text-2xl font-black text-white">{activeListings.length.toString().padStart(2, '0')}</div>
              <div className="mt-1 text-[11px] text-pink-300">Across all categories</div>
            </div>
            <div className="rounded-2xl border border-pink-500/20 bg-black/30 p-4 backdrop-blur-sm">
              <div className="text-[10px] uppercase tracking-[0.16em] font-mono text-slate-500">Your balance</div>
              <div className="mt-1 text-2xl font-black font-mono text-pink-200">{currentWallet.balanceEth.toFixed(2)}</div>
              <div className="mt-1 text-[11px] text-slate-500">ETH · demo wallet</div>
            </div>
          </div>
        </div>
        <div className="relative mt-7 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_250px] gap-3 rounded-2xl border border-white/5 bg-black/25 p-3 sm:p-4">
          <label className="relative block">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-pink-300" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by object, ORBIT ID, brand or model..." className="h-12 w-full rounded-xl border border-slate-700/70 bg-[#080711]/90 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-pink-400/70 focus:ring-2 focus:ring-pink-500/10" />
          </label>
          <label className="relative block">
            <SlidersHorizontal className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-pink-300" />
            <select value={category} onChange={e => setCategory(e.target.value)} aria-label="Filter by category" className="h-12 w-full appearance-none rounded-xl border border-slate-700/70 bg-[#080711]/90 pl-11 pr-10 text-sm text-slate-200 outline-none transition focus:border-pink-400/70 focus:ring-2 focus:ring-pink-500/10">
              {CATEGORIES.map(c => <option key={c} value={c}>{c === 'ALL' ? 'All categories' : c}</option>)}
            </select>
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">⌄</span>
          </label>
        </div>
        <div className="relative mt-4 flex flex-wrap items-center justify-between gap-2 text-xs">
          <p className="text-slate-400">Showing <span className="font-bold text-white">{filteredListings.length}</span> of {activeListings.length} available objects</p>
          <p className="inline-flex items-center gap-2 text-slate-500"><ShieldCheck className="h-4 w-4 text-emerald-400" /> Passport history stays attached</p>
        </div>
      </div>

      {message && (
        <div className="mb-5 flex items-start justify-between gap-3 px-4 py-3 rounded-xl bg-cyan-950/40 border border-cyan-700/50 text-xs text-cyan-200">
          <span>{message}</span>
          <button onClick={() => setMessage(null)} className="text-cyan-400 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-8">
        <div className="lg:col-span-8 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search ORBIT ID, brand, model..." className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-pink-500" />
          </div>
          <select value={category} onChange={e => setCategory(e.target.value)} className="px-3 py-3 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-slate-300 focus:outline-none focus:border-pink-500">
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="lg:col-span-4 p-3 rounded-xl bg-amber-950/25 border border-amber-700/30 text-[11px] text-amber-200 leading-relaxed">
          <strong className="text-amber-100">Demo marketplace settlement:</strong> the listing, price and ownership workflow are integrated now. Payment is simulated until an ORBIT marketplace smart contract is deployed; the passport itself remains the source of provenance.
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {filteredListings.map(listing => {
          const obj = objectMap.get(listing.objectId)!;
          const isSeller = listing.sellerAddress.toLowerCase() === currentWallet.address.toLowerCase();
          const canBuy = !isSeller && currentWallet.balanceEth >= Number(listing.priceEth);
          return (
            <article key={listing.id} className="group rounded-2xl overflow-hidden bg-gradient-to-b from-[#18091b] to-[#0b0812] border border-pink-500/15 hover:border-pink-400/50 shadow-xl shadow-black/20 transition-all duration-300 hover:-translate-y-1">
              <button onClick={() => onSelectObject(obj.id)} className="block w-full text-left cursor-pointer">
                <div className="relative h-52 overflow-hidden bg-slate-950">
                  <img src={obj.imageUrl} alt={obj.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#14051d] via-transparent to-transparent" />
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-slate-950/80 border border-pink-500/30 text-pink-300 font-mono text-[10px] font-bold">{obj.orbitId}</div>
                  <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Passport attached</div>
                </div>
              </button>
              <div className="p-4 space-y-3">
                <div>
                  <h2 className="font-bold text-white truncate">{obj.name}</h2>
                  <p className="text-xs text-slate-500 mt-1">{obj.brand} · {obj.model} · {obj.condition}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                  <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800"><span className="text-slate-600 block">SELLER</span><span className="text-slate-300">{listing.sellerName}</span></div>
                  <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800"><span className="text-slate-600 block">SERIAL</span><span className="text-cyan-300">{obj.serialHash.slice(0, 14)}...</span></div>
                </div>
                <div className="flex items-end justify-between pt-1">
                  <div><div className="text-[9px] uppercase font-mono text-slate-500">Asking price</div><div className="text-2xl font-black font-mono text-pink-200">{listing.priceEth} ETH</div></div>
                  <button onClick={() => onSelectObject(obj.id)} className="p-2.5 rounded-xl bg-pink-950/40 border border-pink-500/20 hover:bg-pink-900/50 text-pink-200 transition" title="View passport"><Eye className="w-4 h-4" /></button>
                </div>
                {isSeller ? (
                  <button disabled={busyId === listing.id} onClick={() => handleCancel(listing)} className="w-full py-2.5 rounded-lg bg-rose-950/40 border border-rose-800/70 text-rose-300 text-xs font-bold hover:bg-rose-900/50">{busyId === listing.id ? 'Cancelling...' : 'Cancel Listing'}</button>
                ) : (
                  <button disabled={!canBuy || busyId === listing.id} onClick={() => handlePurchase(listing)} className="w-full py-2.5 rounded-lg bg-gradient-to-r from-pink-500 to-[#be2b65] text-white text-xs font-black hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {busyId === listing.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Tag className="w-4 h-4" />}
                    {busyId === listing.id ? 'Completing purchase...' : canBuy ? `Buy for ${listing.priceEth} ETH` : 'Insufficient demo balance'}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {filteredListings.length === 0 && <div className="py-16 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl">No active listings match your search.</div>}

      <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-2xl bg-slate-950/70 border border-slate-800 p-5">
          <div className="flex items-center gap-2 mb-4"><Tag className="w-4 h-4 text-pink-400" /><h2 className="font-bold text-white">List an object for resale</h2></div>
          <form onSubmit={handleList} className="space-y-3">
            <select value={listingObjectId} onChange={e => setListingObjectId(e.target.value)} className="w-full px-3 py-2.5 rounded-lg bg-slate-900 border border-slate-800 text-sm text-slate-300">
              <option value="">Select an owned object...</option>
              {mySellableObjects.map(obj => <option key={obj.id} value={obj.id}>{obj.orbitId} · {obj.name}</option>)}
            </select>
            <div className="flex gap-2"><input value={price} onChange={e => setPrice(e.target.value)} type="number" min="0.0001" step="0.0001" placeholder="Price in ETH" className="flex-1 px-3 py-2.5 rounded-lg bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-600" /><button disabled={busyId === 'listing'} className="px-5 rounded-lg bg-pink-600 hover:bg-pink-500 text-white text-xs font-black disabled:opacity-50">{busyId === 'listing' ? 'Listing...' : 'List for Sale'}</button></div>
          </form>
          <p className="mt-3 text-[10px] text-slate-500">The complete ORBIT Passport remains attached to the object during resale.</p>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-cyan-950/30 to-slate-950 border border-cyan-800/30 p-5">
          <div className="flex items-center gap-2 mb-3"><BadgeCheck className="w-4 h-4 text-cyan-400" /><h2 className="font-bold text-white">Why ORBIT resale is different</h2></div>
          <ul className="space-y-2 text-xs text-slate-400">
            <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> Buyer sees the verified object identity before purchase.</li>
            <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> Repairs, inspections and prior ownership remain in the timeline.</li>
            <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> Ownership changes are recorded as a new provenance event.</li>
            <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> Buyer can open the full passport before committing.</li>
          </ul>
        </div>
      </div>
    </section>
  );
};
