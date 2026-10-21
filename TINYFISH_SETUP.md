# ORBIT + TinyFish setup

This integration adds two TinyFish-powered tools to each Object Passport:

- **Market value:** searches Amazon India and eBay for comparable listings and displays any price mentions that appear in search snippets. Results are asking-price clues, not a formal appraisal or verified sold-price dataset.
- **Repair helper:** searches for model-specific support/manuals and replacement parts, with an optional description of the fault.

## 1. Create an API key

1. Sign in at https://agent.tinyfish.ai/api-keys
2. Create a TinyFish API key.
3. Copy `.env.example` to `.env` and set `TINYFISH_API_KEY=your_key`.
4. Never put the key in a `VITE_...` variable or commit `.env`. The browser calls ORBIT's own `/api/orbit/...` routes; the server adds the `X-API-Key` header.

## 2. Run locally

```bash
npm install
cp .env.example .env
# Edit .env and set TINYFISH_API_KEY
npm run dev
```

Open http://localhost:3000. The development server runs Express and Vite in one process, so the API and frontend use the same origin.

## 3. Production

```bash
npm install
npm run build
NODE_ENV=production npm start
```

Deploy this as a Node server that can run Express, not as a static-only hosting target. Set `TINYFISH_API_KEY` and `NODE_ENV=production` in the hosting provider's server-side environment settings. Keep the key out of client build variables and logs. If your host only serves static files (for example, a static-only Netlify deployment), deploy the API separately and configure the frontend API base/proxy for that host before going live.

## Notes and limitations

- The app currently displays search-engine results, snippets, links, and price mentions when a result snippet contains a recognizable currency amount. It does not yet scrape every listing's product page or compute a statistically reliable median price. Do not describe this as a guaranteed appraisal.
- Search result availability varies by marketplace, region, and model. A result may not show price in its snippet; open the source listing to verify it.
- Repair links are suggestions. Confirm part numbers and model compatibility with the manufacturer or a qualified repair centre.
- The server includes a lightweight in-memory rate guard. For multiple production instances, replace it with a shared limiter and apply your usual authentication/authorization controls to user-specific actions.

## ORBIT Intelligence Hub (five modules)

The item-card **Open Intelligence Hub** action exposes these server-backed checks:

- Trust & Risk Scanner: recalls/safety notices, known issues, authenticity guidance.
- Warranty & Support Intelligence: warranty terms, official support, service-centre locators.
- Resale Demand & Price Trends: current asking-price listings and any discoverable historical/demand evidence.
- Repair-vs-Replace Decision Engine: repair-cost evidence compared with resale/replacement clues; use this as decision support, not an automatic verdict.
- End-of-Life Recovery Finder: trade-in/buyback, repair/refurbishment/reuse, and responsible recycling/take-back routes.

Each module calls the existing server-side `tinyFishSearch` helper; no TinyFish key is exposed to the browser. Endpoints are `/api/orbit/trust-scan`, `/api/orbit/warranty-support`, `/api/orbit/price-trends`, `/api/orbit/repair-decision`, and `/api/orbit/recovery-options`. Search results are evidence links, not proof of item authenticity, serial-specific warranty/recall eligibility, guaranteed price trends, or a verified repair quote. Empty search results must not be interpreted as proof that no risks or recovery options exist.
