import React from 'react';
import { ShieldCheck, ShieldAlert, FileCheck2, CircleHelp } from 'lucide-react';
import { PhysicalObject } from '../types/orbit';

function trustAssessment(obj: PhysicalObject) {
  const events = obj.timeline || [];
  const onChainEvents = events.filter(e => Boolean(e.txHash && e.txHash !== '0x' && Number(e.blockNumber) > 0)).length;
  const documentedEvents = events.filter(e => Boolean(e.metadata?.invoiceHash || e.metadata?.verificationNotes)).length;
  const lifecycleCoverage = Math.min(20, events.length * 4);
  const chainCoverage = events.length ? Math.round((onChainEvents / events.length) * 30) : 0;
  const documentCoverage = events.length ? Math.round((documentedEvents / events.length) * 25) : 0;
  const identityCoverage = (obj.brand && obj.model && obj.serialHash ? 15 : (obj.brand && obj.model ? 8 : 0));
  const total = Math.min(100, lifecycleCoverage + chainCoverage + documentCoverage + identityCoverage + (obj.onChainVerified ? 10 : 0));
  const gaps = [
    ...(!obj.serialHash ? ['No serial fingerprint recorded'] : []),
    ...(!obj.onChainVerified ? ['Current passport hash has not been confirmed against the deployed contract'] : []),
    ...(events.some(e => !e.metadata?.invoiceHash && !e.metadata?.verificationNotes) ? ['Some lifecycle events lack supporting document evidence'] : []),
    ...(onChainEvents < events.length ? ['Some timeline events do not include a transaction hash and block number'] : []),
    ...(events.length === 0 ? ['No lifecycle events are available to assess'] : []),
  ];
  return { total, onChainEvents, documentedEvents, events: events.length, gaps };
}

export const PassportTrustPanel: React.FC<{ object: PhysicalObject }> = ({ object }) => {
  const trust = trustAssessment(object);
  const tone = trust.total >= 75 ? 'text-emerald-300' : trust.total >= 45 ? 'text-amber-300' : 'text-rose-300';
  return <section className="rounded-2xl border border-cyan-500/20 bg-slate-950/70 p-5 sm:p-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/10 p-3 text-cyan-300"><ShieldCheck className="h-5 w-5" /></div>
        <div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-cyan-300/70">ORBIT evidence review</p><h2 className="mt-1 text-lg font-bold text-white">Passport trust signals</h2><p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-400">A completeness indicator based on the records available in ORBIT — not proof of physical authenticity or a guarantee that the item is safe.</p></div>
      </div>
      <div className="min-w-28 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-center"><div className={`text-3xl font-black ${tone}`}>{trust.total}<span className="text-sm text-slate-500">/100</span></div><div className="mt-1 text-[9px] font-bold uppercase tracking-widest text-slate-500">Evidence coverage</div></div>
    </div>
    <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3"><div className="flex items-center gap-2 text-xs font-semibold text-slate-200"><ShieldCheck className="h-4 w-4 text-cyan-300"/> Timeline records</div><p className="mt-2 text-xl font-bold text-white">{trust.events}</p><p className="text-[10px] text-slate-500">Recorded lifecycle events</p></div>
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3"><div className="flex items-center gap-2 text-xs font-semibold text-slate-200"><FileCheck2 className="h-4 w-4 text-emerald-300"/> On-chain references</div><p className="mt-2 text-xl font-bold text-white">{trust.onChainEvents}/{trust.events}</p><p className="text-[10px] text-slate-500">Events with tx hash and block</p></div>
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3"><div className="flex items-center gap-2 text-xs font-semibold text-slate-200"><FileCheck2 className="h-4 w-4 text-amber-300"/> Supporting evidence</div><p className="mt-2 text-xl font-bold text-white">{trust.documentedEvents}/{trust.events}</p><p className="text-[10px] text-slate-500">Events with invoice hash or notes</p></div>
    </div>
    <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-bold text-white"><CircleHelp className="h-4 w-4 text-amber-300"/> Evidence gaps to review</div>
      {trust.gaps.length ? <ul className="space-y-1.5">{trust.gaps.slice(0,4).map(gap => <li key={gap} className="flex items-start gap-2 text-xs leading-relaxed text-slate-400"><ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300"/>{gap}</li>)}</ul> : <p className="text-xs text-emerald-300">No gaps detected by these basic completeness checks. This is not an authenticity guarantee.</p>}
    </div>
  </section>;
};
