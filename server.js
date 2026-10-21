import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT || 3000);
app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));

// Lightweight per-process abuse guard for the public search endpoints. Use a shared limiter
// (for example Redis) when deploying multiple server instances.
const requestBuckets = new Map();
app.use('/api/orbit/', (req, res, next) => {
  const now = Date.now();
  const key = req.ip || req.socket.remoteAddress || 'unknown';
  const bucket = requestBuckets.get(key) || { start: now, count: 0 };
  if (now - bucket.start > 60_000) { bucket.start = now; bucket.count = 0; }
  bucket.count += 1;
  requestBuckets.set(key, bucket);
  if (bucket.count > 12) return res.status(429).json({ error: 'Too many searches in a short period. Please wait a minute and try again.' });
  next();
});

const API_URL = 'https://api.search.tinyfish.ai';
const MAX_QUERY_LENGTH = 600;

function cleanText(value, max = 180) {
  return typeof value === 'string' ? value.replace(/[<>]/g, '').trim().slice(0, max) : '';
}

function validateItem(item) {
  if (!item || typeof item !== 'object') return null;
  const brand = cleanText(item.brand, 100);
  const model = cleanText(item.model, 120);
  const name = cleanText(item.name, 180);
  const category = cleanText(item.category, 100);
  const condition = cleanText(item.condition, 50);
  const manufactureYear = Number(item.manufactureYear);
  if (!brand || !model || !name) return null;
  return { brand, model, name, category, condition, manufactureYear: Number.isFinite(manufactureYear) ? manufactureYear : undefined };
}

async function tinyFishSearch({ query, purpose, domains }) {
  if (!process.env.TINYFISH_API_KEY) {
    const error = new Error('TinyFish is not configured yet. Add TINYFISH_API_KEY to your server .env file.');
    error.status = 503;
    throw error;
  }
  const params = new URLSearchParams({ query: query.slice(0, MAX_QUERY_LENGTH), location: 'IN', language: 'en', purpose });
  if (domains) params.set('include_domains', domains);
  const response = await fetch(`${API_URL}?${params.toString()}`, {
    method: 'GET',
    headers: { 'X-API-Key': process.env.TINYFISH_API_KEY, Accept: 'application/json' },
    signal: AbortSignal.timeout(25000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(response.status === 401 ? 'TinyFish API key is invalid. Check TINYFISH_API_KEY.' : response.status === 402 ? 'TinyFish daily allowance or wallet limit reached. Check your TinyFish account.' : response.status === 429 ? 'TinyFish rate limit reached. Wait a moment and try again.' : `TinyFish search failed (${response.status}).`);
    error.status = response.status === 401 ? 503 : response.status === 429 ? 429 : 502;
    throw error;
  }
  const results = Array.isArray(data.results) ? data.results : [];
  return {
    query: cleanText(data.query || query, MAX_QUERY_LENGTH),
    total_results: Number(data.total_results) || results.length,
    results: results.slice(0, 6).map((r) => ({
      title: cleanText(r.title || r.url || 'Search result', 300),
      snippet: cleanText(r.snippet || '', 700),
      url: typeof r.url === 'string' ? r.url : '',
      site_name: cleanText(r.site_name || '', 120),
      priceMention: ((`${r.title || ''} ${r.snippet || ''}`).match(/(?:₹|INR\s?|Rs\.?\s?|\$|USD\s?)\s?\d[\d,]*(?:\.\d{1,2})?/i) || [])[0] || '',
      position: Number(r.position) || undefined,
    })).filter((r) => /^https?:\/\//i.test(r.url)),
  };
}

app.get('/api/health', (_req, res) => res.json({ ok: true, tinyfishConfigured: Boolean(process.env.TINYFISH_API_KEY) }));

app.post('/api/orbit/market-value', async (req, res) => {
  const item = validateItem(req.body?.item);
  if (!item) return res.status(400).json({ error: 'This item needs a brand, model, and name before it can be valued.' });
  const identity = `${item.brand} ${item.model} ${item.name}`.replace(/\s+/g, ' ').trim();
  try {
    const [amazon, ebay] = await Promise.all([
      tinyFishSearch({ query: `${identity} ${item.condition} price listing`, purpose: 'Find current comparable product listings and asking prices for a physical item being considered for resale.', domains: 'amazon.in' }),
      tinyFishSearch({ query: `${identity} ${item.condition} price listing`, purpose: 'Find current comparable product listings and asking prices for a physical item being considered for resale.', domains: 'ebay.com' }),
    ]);
    res.json({ item: { brand: item.brand, model: item.model, condition: item.condition }, marketplaces: [amazon, ebay], searchedAt: new Date().toISOString() });
  } catch (error) {
    console.error('[TinyFish market-value]', error);
    res.status(error.status || 502).json({ error: error.message || 'Market search failed. Please try again.' });
  }
});

app.post('/api/orbit/trust-scan', async (req, res) => {
  const item = validateItem(req.body?.item);
  if (!item) return res.status(400).json({ error: 'This item needs a brand, model, and name before a trust scan can run.' });
  const identity = `${item.brand} ${item.model} ${item.name}`.replace(/\s+/g, ' ').trim();
  try {
    const [recalls, defects, authenticity] = await Promise.all([
      tinyFishSearch({
        query: `${identity} product recall safety notice official manufacturer`,
        purpose: 'Find official manufacturer or government recall and safety notices relevant to this exact product model. Prefer official sources and clearly distinguish matching model evidence from general results.',
        domains: 'consumer.ftc.gov;recalls.gov;consumeraffairs.nic.in',
      }),
      tinyFishSearch({
        query: `${identity} known issues common defects reliability reports`,
        purpose: 'Find credible reports of known defects or recurring issues for this product model. Prefer manufacturer notices, reputable repair sources, and established publications; do not treat forum anecdotes as confirmed facts.',
      }),
      tinyFishSearch({
        query: `${identity} official authenticity verification counterfeit warning manufacturer`,
        purpose: 'Find official manufacturer guidance for verifying product authenticity and credible counterfeit alerts for this model or brand. Do not claim that a specific physical item is genuine or counterfeit based on search results alone.',
      }),
    ]);
    res.json({
      item: { brand: item.brand, model: item.model, name: item.name, category: item.category, manufactureYear: item.manufactureYear },
      checks: [
        { id: 'recalls', label: 'Recalls & safety notices', results: recalls.results },
        { id: 'defects', label: 'Known issues & defect reports', results: defects.results },
        { id: 'authenticity', label: 'Authenticity guidance', results: authenticity.results },
      ],
      searchedAt: new Date().toISOString(),
      disclaimer: 'These are web-sourced signals, not a certification. Verify exact model/serial applicability with the manufacturer or relevant authority. No search results does not prove an item is risk-free.',
    });
  } catch (error) {
    console.error('[TinyFish trust-scan]', error);
    res.status(error.status || 502).json({ error: error.message || 'Trust scan failed. Please try again.' });
  }
});

app.post('/api/orbit/repair-search', async (req, res) => {
  const item = validateItem(req.body?.item);
  if (!item) return res.status(400).json({ error: 'This item needs a brand, model, and name before repair resources can be found.' });
  const issue = cleanText(req.body?.issue, 240);
  const identity = `${item.brand} ${item.model} ${item.name}`.replace(/\s+/g, ' ').trim();
  try {
    const [manuals, parts] = await Promise.all([
      tinyFishSearch({ query: `${identity} official support repair manual service manual${issue ? ` ${issue}` : ''}`, purpose: 'Find official manufacturer support pages, service manuals, and model-specific repair documentation. Prefer manufacturer domains and authoritative sources.' }),
      tinyFishSearch({ query: `${identity} compatible replacement spare parts part number${issue ? ` ${issue}` : ''}`, purpose: 'Find model-specific spare parts and replacement components. Surface product pages and part-number evidence; do not assume compatibility from generic listings.' }),
    ]);
    res.json({ item: { brand: item.brand, model: item.model }, issue, manuals: manuals.results, parts: parts.results, searchedAt: new Date().toISOString() });
  } catch (error) {
    console.error('[TinyFish repair-search]', error);
    res.status(error.status || 502).json({ error: error.message || 'Repair search failed. Please try again.' });
  }
});


// Additional ORBIT Intelligence Hub modules. All TinyFish calls remain server-side.
app.post('/api/orbit/warranty-support', async (req, res) => {
  const item = validateItem(req.body?.item);
  if (!item) return res.status(400).json({ error: 'Add the item brand, model, and name first.' });
  const identity = `${item.brand} ${item.model} ${item.name}`.replace(/\s+/g, ' ').trim();
  try {
    const [warranty, support, service] = await Promise.all([
      tinyFishSearch({ query: `${identity} official warranty coverage check`, purpose: 'Find official manufacturer warranty terms and warranty-check guidance for this product model. Do not infer this individual item is covered.', domains: 'support.apple.com;hp.com;lenovo.com;dell.com;sony.com;canon-europe.com;nikon.com;consumer.ftc.gov' }),
      tinyFishSearch({ query: `${identity} official product support contact repair`, purpose: 'Find official manufacturer support and repair contact pages for this exact model.' }),
      tinyFishSearch({ query: `${item.brand} authorized service center India ${item.category}`, purpose: 'Find official authorized service-centre locator pages for this brand in India.' }),
    ]);
    res.json({ item: { brand: item.brand, model: item.model, name: item.name }, checks: [
      { id: 'warranty', label: 'Warranty terms & coverage checks', results: warranty.results },
      { id: 'support', label: 'Official support & repair', results: support.results },
      { id: 'service', label: 'Authorized service locations', results: service.results },
    ], searchedAt: new Date().toISOString(), disclaimer: 'Search results are guidance only. Coverage depends on purchase date, region, proof of purchase, and serial-specific eligibility; confirm with the manufacturer.' });
  } catch (error) { console.error('[TinyFish warranty-support]', error); res.status(error.status || 502).json({ error: error.message || 'Warranty search failed.' }); }
});

app.post('/api/orbit/price-trends', async (req, res) => {
  const item = validateItem(req.body?.item);
  if (!item) return res.status(400).json({ error: 'Add the item brand, model, and name first.' });
  const identity = `${item.brand} ${item.model} ${item.name}`.replace(/\s+/g, ' ').trim();
  try {
    const [current, trend] = await Promise.all([
      tinyFishSearch({ query: `${identity} used refurbished resale price India current listings`, purpose: 'Find current resale asking prices and comparable listings for this model. Results are asking prices, not confirmed sale prices.' }),
      tinyFishSearch({ query: `${identity} resale value price history price drop used market`, purpose: 'Find credible price history, depreciation, or resale-demand evidence for this model. If no historical dataset is found, report that limitation rather than inventing a trend.' }),
    ]);
    res.json({ item: { brand: item.brand, model: item.model, condition: item.condition }, checks: [
      { id: 'current', label: 'Current resale listings', results: current.results },
      { id: 'trend', label: 'Price history & demand signals', results: trend.results },
    ], searchedAt: new Date().toISOString(), disclaimer: 'Search snapshots are not a time series or verified sold-price feed. Price movement cannot be calculated reliably without comparable historical observations.' });
  } catch (error) { console.error('[TinyFish price-trends]', error); res.status(error.status || 502).json({ error: error.message || 'Price trend search failed.' }); }
});

app.post('/api/orbit/repair-decision', async (req, res) => {
  const item = validateItem(req.body?.item);
  if (!item) return res.status(400).json({ error: 'Add the item brand, model, and name first.' });
  const issue = cleanText(req.body?.issue, 240);
  const identity = `${item.brand} ${item.model} ${item.name}`.replace(/\s+/g, ' ').trim();
  try {
    const [repair, resale] = await Promise.all([
      tinyFishSearch({ query: `${identity} ${issue} repair cost estimate service price India`, purpose: 'Find model- and issue-relevant repair cost estimates from repair providers. Treat prices as indicative and verify with a technician.' }),
      tinyFishSearch({ query: `${identity} used refurbished resale price India`, purpose: 'Find current comparable resale asking prices to help compare repair and replacement options.' }),
    ]);
    res.json({ item: { brand: item.brand, model: item.model, name: item.name, condition: item.condition }, issue, checks: [
      { id: 'repair', label: 'Repair cost evidence', results: repair.results },
      { id: 'resale', label: 'Resale / replacement value clues', results: resale.results },
    ], searchedAt: new Date().toISOString(), disclaimer: 'This is a comparison aid, not a definitive financial recommendation. Search snippets may omit costs; obtain a repair quote and compare like-for-like replacement prices before deciding.' });
  } catch (error) { console.error('[TinyFish repair-decision]', error); res.status(error.status || 502).json({ error: error.message || 'Repair-vs-replace analysis failed.' }); }
});

app.post('/api/orbit/recovery-options', async (req, res) => {
  const item = validateItem(req.body?.item);
  if (!item) return res.status(400).json({ error: 'Add the item brand, model, and name first.' });
  const identity = `${item.brand} ${item.model} ${item.name}`.replace(/\s+/g, ' ').trim();
  try {
    const [tradein, refurbish, recycle] = await Promise.all([
      tinyFishSearch({ query: `${identity} official trade in buyback exchange India`, purpose: 'Find legitimate manufacturer or established retailer trade-in and buyback options relevant to this item.' }),
      tinyFishSearch({ query: `${identity} refurbished resale repair reuse India`, purpose: 'Find credible refurbish, repair, reuse, or second-hand resale routes for this item.' }),
      tinyFishSearch({ query: `${item.category || item.name} authorized e-waste recycling take back India official`, purpose: 'Find responsible official take-back, e-waste recycling, or material recovery options relevant to this item category in India.', domains: 'cpcb.nic.in;moef.gov.in' }),
    ]);
    res.json({ item: { brand: item.brand, model: item.model, name: item.name, category: item.category }, checks: [
      { id: 'tradein', label: 'Trade-in & buyback', results: tradein.results },
      { id: 'refurbish', label: 'Repair, refurbish & reuse', results: refurbish.results },
      { id: 'recycle', label: 'Responsible recycling & take-back', results: recycle.results },
    ], searchedAt: new Date().toISOString(), disclaimer: 'Confirm eligibility, fees, data-wiping requirements, and local acceptance directly with the provider. Do not dispose of electronics in general household waste.' });
  } catch (error) { console.error('[TinyFish recovery-options]', error); res.status(error.status || 502).json({ error: error.message || 'Recovery search failed.' }); }
});


app.post('/api/orbit/buyer-recommendation', async (req, res) => {
  const item = validateItem(req.body?.item);
  if (!item) return res.status(400).json({ error: 'Add the item brand, model, and name before requesting a recommendation.' });
  const lifecycle = Array.isArray(req.body?.lifecycle) ? req.body.lifecycle.slice(0, 20) : [];
  const identity = `${item.brand} ${item.model} ${item.name}`.replace(/\s+/g, ' ').trim();
  try {
    const [reviews, prices, issues, support] = await Promise.all([
      tinyFishSearch({ query: `${identity} long term review common problems reliability`, purpose: 'Find credible reviews and recurring reliability concerns for a buyer evaluating this exact product model.' }),
      tinyFishSearch({ query: `${identity} used price refurbished price India`, purpose: 'Find current comparable asking prices to estimate a reasonable used-product price range.' }),
      tinyFishSearch({ query: `${identity} known defects recalls complaints repair costs`, purpose: 'Find credible known defects, recalls, complaints, and repair cost evidence. Prefer official sources for recalls.' }),
      tinyFishSearch({ query: `${identity} official warranty support specifications`, purpose: 'Find official manufacturer support, warranty and specification information.' }),
    ]);
    const sources = [
      { label: 'Reviews & reliability', results: reviews.results },
      { label: 'Price evidence', results: prices.results },
      { label: 'Risks & repair signals', results: issues.results },
      { label: 'Official support', results: support.results },
    ];
    const evidence = sources.flatMap(group => group.results.map(r => ({ category: group.label, title: r.title, snippet: r.snippet, url: r.url }))).slice(0, 20);
    const evidenceSummary = JSON.stringify({ item, lifecycle: lifecycle.map(e => ({ type: e.type, title: e.title, description: e.description, hasTransactionReference: Boolean(e.hasTransactionReference), hasSupportingEvidence: Boolean(e.hasSupportingEvidence) })), evidence });
    let recommendation;
    if (process.env.GEMINI_API_KEY) {
      const prompt = `You are ORBIT's cautious buyer-advice assistant. Use ONLY the supplied item, lifecycle summary, and web evidence. Do not invent facts or prices. Distinguish user-reported lifecycle events from transaction-referenced events and supporting evidence. If evidence is weak, say so. Return valid JSON with fields verdict (one of "BUY", "BUY WITH CAUTION", "AVOID", "INSUFFICIENT EVIDENCE"), summary, reasons (array of 3 short strings), risks (array of strings), priceGuidance (string), confidence ("Low"|"Medium"|"High"), nextSteps (array of strings). High confidence requires multiple relevant credible sources. No result does not mean no risk. Data: ${evidenceSummary}`;
      const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0.2 } }),
        signal: AbortSignal.timeout(25000),
      });
      const aiData = await aiResponse.json().catch(() => ({}));
      if (aiResponse.ok) {
        const raw = aiData.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
        try { recommendation = JSON.parse(raw.replace(/^```json\s*/i, '').replace(/\s*```$/, '')); } catch {}
      } else console.error('[Buyer recommendation AI]', aiData.error?.message || aiResponse.status);
    }
    if (!recommendation) {
      const count = evidence.length;
      const hasRisk = issues.results.length > 0;
      recommendation = {
        verdict: count >= 4 ? 'BUY WITH CAUTION' : 'INSUFFICIENT EVIDENCE',
        summary: count >= 4 ? 'Research surfaced relevant information, but review the source evidence and inspect the item before purchase.' : 'There is not enough relevant web evidence to responsibly recommend buying or avoiding this item.',
        reasons: [`Collected ${count} relevant source result(s) across ${sources.length} research areas.`, `Lifecycle contains ${lifecycle.length} recorded event(s); records without transaction references or documents are not independently verified.`, hasRisk ? 'Potential risk/repair sources were found; review them individually.' : 'No risk result was surfaced, which does not establish that the item is risk-free.'],
        risks: issues.results.length ? issues.results.slice(0, 3).map(r => r.title) : ['No conclusive risk assessment is available from the search results.'],
        priceGuidance: prices.results.length ? 'Compare the asking prices in the Price evidence section; these are not confirmed sale prices.' : 'No reliable comparable price range was found.',
        confidence: count >= 8 ? 'Medium' : 'Low',
        nextSteps: ['Compare the exact model and condition with the cited listings.', 'Ask the seller for purchase and repair invoices.', 'Verify warranty, serial number and any recall directly with the manufacturer.'],
      };
    }
    res.json({ item: { brand: item.brand, model: item.model, name: item.name, condition: item.condition }, recommendation, sources, sourceCount: evidence.length, aiGenerated: Boolean(process.env.GEMINI_API_KEY), searchedAt: new Date().toISOString(), disclaimer: 'This is decision support, not proof of authenticity or a guarantee. Web results may be incomplete; verify important claims directly.' });
  } catch (error) {
    console.error('[TinyFish buyer-recommendation]', error);
    res.status(error.status || 502).json({ error: error.message || 'Buyer research could not be completed.' });
  }
});

if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, 'dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
}

app.listen(PORT, '0.0.0.0', () => console.log(`ORBIT app + TinyFish API listening on http://localhost:${PORT}`));
