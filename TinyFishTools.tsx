import React, { useState } from 'react';
import { ExternalLink, Search, Wrench, Tag, LoaderCircle, AlertCircle, Sparkles } from 'lucide-react';
import { PhysicalObject } from '../types/orbit';

type SearchResult = { title: string; snippet: string; url: string; site_name?: string; priceMention?: string; position?: number };
type MarketResponse = { query: string; results: SearchResult[]; total_results?: number };
type RepairResponse = { manuals: SearchResult[]; parts: SearchResult[] };

type Mode = 'value' | 'repair';

const safeExternalUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : '#';
  } catch { return '#'; }
};

export const TinyFishTools: React.FC<{ object: PhysicalObject }> = ({ object }) => {
  const [mode, setMode] = useState<Mode>('value');
  const [issue, setIssue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [market, setMarket] = useState<MarketResponse[] | null>(null);
  const [repair, setRepair] = useState<RepairResponse | null>(null);

  const runSearch = async (nextMode: Mode = mode) => {
    setMode(nextMode);
    setLoading(true);
    setError('');
    try {
      const endpoint = nextMode === 'value' ? '/api/orbit/market-value' : '/api/orbit/repair-search';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item: {
            name: object.name, brand: object.brand, model: object.model,
            category: object.category, condition: object.condition,
            manufactureYear: object.manufactureYear,
          },
          issue: issue.trim(),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Search could not be completed. Please try again.');
      if (nextMode === 'value') setMarket(payload.marketplaces || []);
      else setRepair({ manuals: payload.manuals || [], parts: payload.parts || [] });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong while searching.');
    } finally {
      setLoading(false);
    }
  };

  const renderResults = (items: SearchResult[]) => items.length ? (
    <div className="space-y-2">
      {items.map((item, index) => (
        <a key={`${item.url}-${index}`} href={safeExternalUrl(item.url)} target="_blank" rel="noreferrer noopener"
          className="block rounded-xl border border-slate-700/80 bg-slate-950/60 p-3 transition-colors hover:border-cyan-500/60">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-100">{item.title || item.url}</p>
              <p className="mt-1 text-[11px] text-cyan-300">{item.site_name || (() => { try { return new URL(item.url).hostname; } catch { return 'Source'; } })()}</p>
            </div>
            <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          </div>
          {item.priceMention && <p className="mt-2 inline-flex rounded-md border border-emerald-800/60 bg-emerald-950/30 px-2 py-1 text-[11px] font-semibold text-emerald-300">Price mentioned: {item.priceMention}</p>}
          {item.snippet && <p className="mt-2 text-xs leading-relaxed text-slate-400">{item.snippet}</p>}
        </a>
      ))}
    </div>
  ) : <p className="rounded-xl border border-dashed border-slate-700 p-4 text-xs text-slate-400">No results returned for this search. Try a more specific model number.</p>;

  return (
    <section className="mt-5 rounded-2xl border border-cyan-900/60 bg-slate-900/70 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-cyan-300"><Sparkles className="h-4 w-4" /><span className="text-[10px] font-bold uppercase tracking-[0.2em]">Powered by TinyFish</span></div>
          <h3 className="mt-2 text-lg font-bold text-white">ORBIT Intelligence</h3>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-400">Find comparable listings or model-specific repair resources for {object.brand} {object.model}.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => { setMode('value'); setError(''); }} className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold ${mode === 'value' ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-200' : 'border-slate-700 text-slate-400 hover:text-white'}`}><Tag className="h-3.5 w-3.5" />Market value</button>
          <button type="button" onClick={() => { setMode('repair'); setError(''); }} className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold ${mode === 'repair' ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-200' : 'border-slate-700 text-slate-400 hover:text-white'}`}><Wrench className="h-3.5 w-3.5" />Repair helper</button>
        </div>
      </div>

      {mode === 'repair' && <div className="mt-4"><label htmlFor="orbit-repair-issue" className="mb-1.5 block text-xs font-semibold text-slate-300">What seems to be broken? <span className="font-normal text-slate-500">(optional)</span></label><input id="orbit-repair-issue" value={issue} onChange={e => setIssue(e.target.value)} maxLength={240} placeholder="e.g. battery won't charge, cracked display" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-500" /></div>}

      <button type="button" disabled={loading} onClick={() => void runSearch(mode)} className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-xs font-bold text-slate-950 transition-colors hover:bg-cyan-300 disabled:cursor-wait disabled:opacity-60">
        {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        {loading ? 'Searching the web…' : mode === 'value' ? 'Find current listings' : 'Find manuals & spare parts'}
      </button>
      {error && <div role="alert" className="mt-3 flex items-start gap-2 rounded-xl border border-rose-900/70 bg-rose-950/30 p-3 text-xs text-rose-200"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}

      {mode === 'value' && market && <div className="mt-5 space-y-4">
        <div className="rounded-xl border border-amber-800/50 bg-amber-950/20 p-3 text-xs leading-relaxed text-amber-100/80">These are live web search comparables, not verified completed-sale prices or a formal appraisal. Check exact specifications, condition, region, and currency before setting a resale price.</div>
        {market.map((group, i) => <div key={`${group.query}-${i}`}><h4 className="mb-2 text-sm font-bold text-white">{group.query}</h4>{renderResults(group.results || [])}</div>)}
      </div>}

      {mode === 'repair' && repair && <div className="mt-5 space-y-5">
        <div><h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-white"><Wrench className="h-4 w-4 text-cyan-300" />Manuals & official support</h4>{renderResults(repair.manuals)}</div>
        <div><h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-white"><Tag className="h-4 w-4 text-cyan-300" />Spare parts & components</h4>{renderResults(repair.parts)}</div>
        <p className="text-[11px] leading-relaxed text-slate-500">Search results are suggestions, not a guarantee of part compatibility. Confirm the full model/part number with the manufacturer or a qualified repair centre before purchasing or attempting repairs.</p>
      </div>}
    </section>
  );
};
