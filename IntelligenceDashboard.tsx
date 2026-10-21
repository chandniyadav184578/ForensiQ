import React, { useMemo, useState } from 'react';
import { useOrbit } from '../context/OrbitContext';
import { ArrowUpRight, ShieldAlert, CheckCircle2, Coins, Cpu, Recycle, Search, ExternalLink, LoaderCircle, Sparkles, BrainCircuit, AlertTriangle } from 'lucide-react';

const modules = [
  { id: 'trust-scan', label: 'Trust & Risk Scanner', short: 'Trust & Risk', desc: 'Look for recalls, known defects, and risk signals.', icon: ShieldAlert, tag: '01 / PROTECT' },
  { id: 'warranty-support', label: 'Warranty & Support', short: 'Warranty & Support', desc: 'Find warranty guidance and official support options.', icon: CheckCircle2, tag: '02 / MAINTAIN' },
  { id: 'price-trends', label: 'Resale Demand & Price Trends', short: 'Resale Trends', desc: 'Review resale listings and market-demand signals.', icon: Coins, tag: '03 / VALUE' },
  { id: 'repair-decision', label: 'Repair vs Replace', short: 'Repair vs Replace', desc: 'Compare repair options with replacement clues.', icon: Cpu, tag: '04 / DECIDE' },
  { id: 'recovery-options', label: 'End-of-Life Recovery Finder', short: 'Recovery Finder', desc: 'Explore trade-in, reuse, donation, and recycling routes.', icon: Recycle, tag: '05 / RECOVER' },
];

export const IntelligenceDashboard: React.FC<{ initialObjectId?: string; onSelectObject: (objectId: string) => void }> = ({ initialObjectId, onSelectObject }) => {
  const { objects } = useOrbit();
  const [selectedId, setSelectedId] = useState(initialObjectId || objects[0]?.id || '');
  const [activeModule, setActiveModule] = useState('trust-scan');
  const [issue, setIssue] = useState('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [buyerRecommendation, setBuyerRecommendation] = useState<any>(null);
  const [buyerLoading, setBuyerLoading] = useState(false);
  const [buyerError, setBuyerError] = useState('');
  const selectedObject = useMemo(() => objects.find(obj => obj.id === selectedId) || objects[0], [objects, selectedId]);

  const getBuyerRecommendation = async () => {
    if (!selectedObject) { setBuyerError('Register or select a passport first.'); return; }
    setBuyerLoading(true); setBuyerError(''); setBuyerRecommendation(null);
    try {
      const response = await fetch('/api/orbit/buyer-recommendation', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item: { brand: selectedObject.brand, model: selectedObject.model, name: selectedObject.name, category: selectedObject.category, condition: selectedObject.condition, manufactureYear: selectedObject.manufactureYear },
          lifecycle: (selectedObject.timeline || []).map(event => ({
            type: event.type, title: event.title, description: event.description,
            hasTransactionReference: Boolean(event.txHash && event.txHash !== '0x' && Number(event.blockNumber) > 0),
            hasSupportingEvidence: Boolean(event.metadata?.invoiceHash || event.metadata?.verificationNotes),
          })),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || `Recommendation failed (HTTP ${response.status}).`);
      if (!result.recommendation || !Array.isArray(result.sources)) throw new Error('Unexpected recommendation response. Please retry.');
      setBuyerRecommendation(result);
    } catch (err) { setBuyerError(err instanceof Error ? err.message : 'Could not generate buyer recommendation.'); }
    finally { setBuyerLoading(false); }
  };

  const runModule = async (moduleId = activeModule) => {
    if (!selectedObject) { setError('Register or select an object passport before running a check.'); return; }
    setActiveModule(moduleId); setData(null); setError(''); setLoading(true);
    try {
      const response = await fetch(`/api/orbit/${moduleId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item: {
            brand: selectedObject.brand, model: selectedObject.model, name: selectedObject.name,
            category: selectedObject.category, condition: selectedObject.condition,
            manufactureYear: selectedObject.manufactureYear,
            lifecycle: (selectedObject.timeline || []).map(event => ({
              type: event.type, title: event.title, description: event.description,
              timestamp: event.timestamp,
              hasTransactionReference: Boolean(event.txHash && event.txHash !== '0x' && Number(event.blockNumber) > 0),
              hasSupportingEvidence: Boolean(event.metadata?.invoiceHash || event.metadata?.verificationNotes),
            })),
            evidenceCoverage: {
              lifecycleEventCount: (selectedObject.timeline || []).length,
              onChainReferenceCount: (selectedObject.timeline || []).filter(event => Boolean(event.txHash && event.txHash !== '0x' && Number(event.blockNumber) > 0)).length,
              supportingEvidenceCount: (selectedObject.timeline || []).filter(event => Boolean(event.metadata?.invoiceHash || event.metadata?.verificationNotes)).length,
              passportOnChainVerified: Boolean(selectedObject.onChainVerified),
            },
          },
          issue,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || `Intelligence service returned HTTP ${response.status}.`);
      if (!result || !Array.isArray(result.checks)) throw new Error('The intelligence service returned an unexpected response. Please retry.');
      setData(result);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not complete this intelligence check.'); }
    finally { setLoading(false); }
  };

  return <div className="mx-auto w-full max-w-7xl px-4 pb-14 pt-6 sm:px-6 lg:px-8">
    <div className="mb-7 flex flex-col gap-5 border-b border-pink-500/20 pb-7 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-pink-500/25 bg-pink-950/30 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.2em] text-pink-300"><Sparkles className="h-3.5 w-3.5" /> ORBIT / Intelligence</div>
        <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">Intelligence <span className="text-pink-400">Dashboard</span></h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-pink-100/65">Five research tools connected to each passport’s recorded lifecycle and evidence coverage. Run a check, review source links, and decide your next step.</p>
      </div>
      <div className="w-full lg:max-w-sm">
        <label htmlFor="orbit-intel-object" className="mb-2 block text-[10px] font-bold uppercase tracking-[.18em] text-pink-200/70">Choose an object passport</label>
        <select id="orbit-intel-object" value={selectedObject?.id || ''} onChange={e => { setSelectedId(e.target.value); setData(null); setError(''); }} className="w-full rounded-xl border border-pink-500/30 bg-[#17051f] px-4 py-3 text-sm text-white outline-none transition focus:border-pink-400 focus:ring-2 focus:ring-pink-500/15" disabled={!objects.length}>
          {!objects.length && <option value="">No registered objects yet</option>}
          {objects.map(obj => <option key={obj.id} value={obj.id}>{obj.brand} {obj.model} — {obj.name}</option>)}
        </select>
        {selectedObject && <button onClick={() => onSelectObject(selectedObject.id)} className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-pink-300 transition hover:text-pink-100">Open this passport <ArrowUpRight className="h-3.5 w-3.5" /></button>}
      </div>
    </div>

    {selectedObject && <div className="mb-7 flex flex-col gap-3 rounded-2xl border border-pink-500/20 bg-[#16051e]/85 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-pink-300/65">Selected asset</p><h2 className="mt-1 truncate text-lg font-bold text-white">{selectedObject.brand} {selectedObject.model}</h2><p className="mt-1 truncate text-xs text-pink-100/55">{selectedObject.name} <span className="px-1.5 text-pink-500/70">·</span> {selectedObject.category} <span className="px-1.5 text-pink-500/70">·</span> {selectedObject.condition}</p></div>
      <div className="shrink-0 rounded-xl border border-pink-500/20 bg-[#210828] px-3.5 py-2"><p className="text-[9px] uppercase tracking-widest text-pink-200/50">Passport ID</p><p className="mt-0.5 font-mono text-sm font-bold text-pink-200">{selectedObject.orbitId}</p></div>
    </div>}

    <section className="mb-8 overflow-hidden rounded-2xl border border-fuchsia-400/30 bg-gradient-to-br from-[#25102d] via-[#180720] to-[#100516] shadow-xl shadow-fuchsia-950/20">
      <div className="flex flex-col gap-4 border-b border-fuchsia-300/15 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-fuchsia-300/25 bg-fuchsia-400/10 text-fuchsia-200"><BrainCircuit className="h-5 w-5" /></span>
          <div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-fuchsia-200/70">ORBIT Buyer Copilot · TinyFish + AI</p>
            <h2 className="mt-1 text-xl font-black text-white">Should you buy this item?</h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-pink-100/60">Researches reviews, current asking prices, known issues and official support, then combines the findings with available passport history into one buyer recommendation.</p>
          </div>
        </div>
        <button onClick={getBuyerRecommendation} disabled={buyerLoading || !selectedObject} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#d94680] to-[#a832c4] px-5 py-3 text-xs font-extrabold text-white shadow-lg shadow-fuchsia-950/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">
          {buyerLoading ? <LoaderCircle className="h-4 w-4 animate-spin"/> : <Sparkles className="h-4 w-4"/>}{buyerLoading ? 'Researching the web…' : 'Get buyer recommendation'}
        </button>
      </div>
      {buyerLoading && <div className="p-5 text-xs text-pink-100/65">TinyFish is gathering relevant sources across multiple research areas. This may take a little while.</div>}
      {buyerError && <div role="alert" className="m-4 rounded-xl border border-rose-400/25 bg-rose-950/25 p-3 text-xs text-rose-100">{buyerError}</div>}
      {buyerRecommendation && !buyerLoading && <div className="space-y-4 p-4 sm:p-6">
        <div className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
          <div className="rounded-xl border border-fuchsia-300/20 bg-black/20 p-4">
            <div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-fuchsia-300/25 bg-fuchsia-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-fuchsia-100">{buyerRecommendation.recommendation.verdict}</span><span className="text-[10px] text-pink-100/50">Confidence: {buyerRecommendation.recommendation.confidence}</span></div>
            <h3 className="mt-3 text-lg font-bold text-white">Buyer verdict</h3><p className="mt-2 text-sm leading-relaxed text-pink-100/75">{buyerRecommendation.recommendation.summary}</p>
            <p className="mt-3 text-xs leading-relaxed text-pink-100/60"><strong className="text-pink-100">Price guidance:</strong> {buyerRecommendation.recommendation.priceGuidance}</p>
          </div>
          <div className="rounded-xl border border-pink-300/15 bg-black/15 p-4">
            <h3 className="flex items-center gap-2 text-sm font-bold text-white"><AlertTriangle className="h-4 w-4 text-amber-300"/> Reasons & risk signals</h3>
            <ul className="mt-3 space-y-2">{[...(buyerRecommendation.recommendation.reasons || []), ...(buyerRecommendation.recommendation.risks || []).map((r: string) => `Risk to check: ${r}`)].map((reason: string, i: number) => <li key={i} className="flex gap-2 text-xs leading-relaxed text-pink-100/65"><span className="text-fuchsia-300">•</span><span>{reason}</span></li>)}</ul>
          </div>
        </div>
        <div className="rounded-xl border border-pink-300/15 bg-black/15 p-4"><h3 className="text-sm font-bold text-white">Before you decide</h3><ul className="mt-2 grid gap-2 sm:grid-cols-2">{(buyerRecommendation.recommendation.nextSteps || []).map((step: string, i: number) => <li key={i} className="text-xs leading-relaxed text-pink-100/65">{i + 1}. {step}</li>)}</ul></div>
        <div><div className="mb-3 flex items-center justify-between gap-2"><h3 className="text-sm font-bold text-white">Research evidence</h3><span className="text-[10px] text-pink-100/45">{buyerRecommendation.sourceCount} results · {buyerRecommendation.aiGenerated ? 'AI-assisted analysis' : 'evidence-based fallback'}</span></div>
          <div className="grid gap-3 md:grid-cols-2">{buyerRecommendation.sources.map((group: any) => <div key={group.label} className="rounded-xl border border-pink-300/15 bg-black/15 p-3"><div className="mb-2 flex items-center justify-between gap-2"><p className="text-xs font-bold text-pink-100">{group.label}</p><span className="text-[10px] text-pink-100/40">{group.results?.length || 0}</span></div>{!group.results?.length ? <p className="text-[11px] text-pink-100/40">No relevant sources found in this search.</p> : group.results.slice(0,3).map((source: any, i: number) => <a key={source.url || i} href={source.url} target="_blank" rel="noreferrer noopener" className="mb-2 block rounded-lg border border-pink-300/10 p-2 hover:border-fuchsia-300/30"><span className="flex items-start justify-between gap-2 text-xs font-semibold text-fuchsia-100">{source.title || source.url}<ExternalLink className="h-3 w-3 shrink-0"/></span><span className="mt-1 block text-[11px] leading-relaxed text-pink-100/50">{source.snippet}</span></a>)}</div>)}</div>
        </div>
        <p className="text-[10px] leading-relaxed text-pink-100/40">{buyerRecommendation.disclaimer} Checked {new Date(buyerRecommendation.searchedAt).toLocaleString()}.</p>
      </div>}
    </section>

    <div className="mb-4 flex items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-pink-300/60">Tool suite</p><h2 className="mt-1 text-lg font-bold text-white">Choose a check to run</h2></div><span className="rounded-full border border-pink-500/20 bg-[#190721] px-3 py-1.5 text-[10px] font-semibold text-pink-200/70">5 modules available</span></div>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {modules.map((module, index) => { const Icon = module.icon; const active = activeModule === module.id; return <button key={module.id} onClick={() => runModule(module.id)} disabled={loading || !selectedObject} className={`group flex min-h-48 flex-col rounded-2xl border p-5 text-left transition duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${active ? 'border-pink-400/60 bg-gradient-to-br from-[#32102f] to-[#1b0824] shadow-lg shadow-pink-950/20' : 'border-pink-500/20 bg-[#13051b]/90 hover:-translate-y-0.5 hover:border-pink-400/45 hover:bg-[#1b0724]'}`}>
        <div className="flex items-start justify-between gap-3"><span className={`flex h-11 w-11 items-center justify-center rounded-xl border ${active ? 'border-pink-400/30 bg-pink-500/15 text-pink-200' : 'border-pink-500/20 bg-[#260a2c] text-pink-300'}`}><Icon className="h-5 w-5" /></span><span className="text-[9px] font-bold tracking-[.16em] text-pink-200/45">{module.tag}</span></div>
        <h3 className="mt-5 text-base font-bold text-white">{module.label}</h3><p className="mt-1.5 text-xs leading-relaxed text-pink-100/55">{module.desc}</p>
        <span className="mt-auto flex items-center gap-1.5 pt-5 text-[10px] font-extrabold uppercase tracking-[.15em] text-pink-300">{active ? 'Run again' : 'Run check'} <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></span>
      </button>; })}
    </div>

    {activeModule === 'repair-decision' && <div className="mt-5 rounded-2xl border border-pink-500/20 bg-[#16051e] p-4 sm:p-5"><label htmlFor="orbit-repair-issue" className="mb-2 block text-xs font-semibold text-pink-100">What seems to be wrong? <span className="font-normal text-pink-200/45">Optional</span></label><div className="flex flex-col gap-2 sm:flex-row"><input id="orbit-repair-issue" value={issue} onChange={e => setIssue(e.target.value)} maxLength={240} placeholder="e.g. battery won't charge, display cracked" className="min-w-0 flex-1 rounded-xl border border-pink-500/25 bg-[#0d0312] px-4 py-3 text-sm text-white outline-none placeholder:text-pink-100/30 focus:border-pink-400"/><button onClick={() => runModule('repair-decision')} disabled={loading || !selectedObject} className="rounded-xl bg-gradient-to-r from-[#d94680] to-[#be2b65] px-5 py-3 text-xs font-extrabold text-white transition hover:brightness-110 disabled:opacity-50">Compare options</button></div></div>}

    {loading && <div className="mt-6 flex flex-col items-center rounded-2xl border border-pink-500/20 bg-[#16051e]/80 px-4 py-12 text-center"><LoaderCircle className="h-8 w-8 animate-spin text-pink-400"/><p className="mt-4 text-sm font-bold text-white">Gathering relevant sources</p><p className="mt-1 text-xs text-pink-100/50">TinyFish is researching this model alongside the passport context you have recorded.</p></div>}
    {error && <div role="alert" className="mt-6 rounded-2xl border border-rose-500/30 bg-rose-950/25 p-4 text-sm text-rose-100"><strong>We couldn’t complete this check.</strong><p className="mt-1 text-xs leading-relaxed text-rose-100/70">{error}</p><button onClick={() => runModule(activeModule)} className="mt-3 rounded-lg border border-rose-400/30 px-3 py-2 text-xs font-semibold hover:bg-rose-900/30">Try again</button></div>}
    {data && !loading && <div className="mt-7 space-y-4"><div className="flex items-start gap-3 rounded-2xl border border-pink-500/20 bg-[#1a0921] p-4"><Search className="mt-0.5 h-4 w-4 shrink-0 text-pink-300"/><div><p className="text-xs font-bold text-white">Review the evidence</p><p className="mt-1 text-xs leading-relaxed text-pink-100/55">Search results are guidance, not a guarantee of authenticity, serial-specific recall status, warranty coverage, or repair compatibility.</p></div></div>
      {data.checks?.map((check: any) => <section key={check.id} className="overflow-hidden rounded-2xl border border-pink-500/20 bg-[#13051b]"><div className="flex items-center justify-between gap-3 border-b border-pink-500/15 px-4 py-4 sm:px-5"><div><p className="text-[9px] font-bold uppercase tracking-[.18em] text-pink-300/55">Source review</p><h3 className="mt-1 text-sm font-bold text-white">{check.label}</h3></div><span className="shrink-0 rounded-full border border-pink-500/20 bg-[#22082b] px-2.5 py-1 text-[10px] text-pink-200/70">{check.results?.length || 0} sources</span></div>
        <div className="space-y-2 p-3 sm:p-4">{!check.results?.length ? <p className="rounded-xl border border-dashed border-pink-500/20 px-4 py-5 text-xs text-pink-100/50">No useful results surfaced in this search. That does not mean the item is risk-free.</p> : check.results.map((result: any, index: number) => { let sourceName = result.site_name || 'Open source'; try { sourceName = result.site_name || new URL(result.url).hostname; } catch {} return <article key={`${check.id}-${result.url}-${index}`} className="rounded-xl border border-pink-500/15 bg-[#190721] p-4"><a href={result.url} target="_blank" rel="noreferrer noopener" className="flex items-start justify-between gap-3 text-sm font-semibold leading-snug text-pink-200 hover:text-white">{result.title || result.url}<ExternalLink className="mt-0.5 h-4 w-4 shrink-0"/></a><p className="mt-2 text-xs leading-relaxed text-pink-100/55">{result.snippet || 'Open the source to review the details.'}</p><div className="mt-3 truncate text-[10px] font-semibold uppercase tracking-wider text-pink-300/45">{sourceName}</div></article>; })}</div></section>)}
      <div className="flex flex-col gap-1 border-t border-pink-500/15 pt-3 sm:flex-row sm:justify-between"><p className="text-[10px] text-pink-100/40">Verify important details with the manufacturer or provider.</p><p className="text-[10px] text-pink-100/45">Checked {data.searchedAt ? new Date(data.searchedAt).toLocaleString() : 'just now'}</p></div></div>}
    {!data && !loading && !error && <div className="mt-6 rounded-2xl border border-dashed border-pink-500/20 px-5 py-7 text-center"><p className="text-sm font-semibold text-white">Ready when you are.</p><p className="mt-1 text-xs text-pink-100/50">Choose any module above to run it for the selected passport.</p></div>}
    <div className="mt-8 flex flex-col gap-2 border-t border-pink-500/15 pt-5 text-[10px] text-pink-100/40 sm:flex-row sm:items-center sm:justify-between"><span>ORBIT Intelligence · powered by TinyFish web research</span><span>Source-led insights. Final decisions stay yours.</span></div>
  </div>;
};
