# ORBIT Hackathon Demo Runbook

## Suggested 3-minute flow
1. Open a registered passport and explain the physical identity fields and serial fingerprint.
2. Show **Passport trust signals**. Explain that its score measures evidence coverage, not whether a physical item is guaranteed genuine.
3. Open the lifecycle timeline. Distinguish transaction references from local/user-entered records; open transaction links in Sepolia explorer only when a real transaction hash exists.
4. Open the QR/tag modal and scan the generated QR with a phone or show the copied URL. The `?orbit=...` route opens the matching passport in the same deployed ORBIT app; it is not a standalone public record unless the deployment exposes that record to unauthenticated visitors.
5. Run a TinyFish trust scan or repair-vs-replace check. Open at least one source and explain that model-level web research is supporting context, not serial-specific proof.
6. If demonstrating on-chain verification, use only a contract address actually deployed to Sepolia and a token ID that was actually minted. Never present seed data or local timeline entries as on-chain-confirmed.

## Pre-demo checklist
- [ ] `npm install` completes and `npm run lint` / `npm run build` pass.
- [ ] `TINYFISH_API_KEY` is set in the server `.env` file and is not exposed through a `VITE_` variable.
- [ ] All five Intelligence Dashboard modules have been tried; gracefully explain empty search results.
- [ ] QR URL opens the intended passport on the deployed app.
- [ ] Sepolia verification is tested with the real deployed contract and minted token ID.
- [ ] Demo records are labelled clearly; don't describe a local event as an immutable on-chain event.
- [ ] Keep a short backup screen recording in case venue Wi-Fi or an external API is unavailable.

## Trust score interpretation
The dashboard's evidence coverage score is a transparent completeness heuristic based on available lifecycle records, transaction references, supporting evidence fields, identity fields, and the passport's on-chain verification flag. It is not a fraud probability, physical inspection, or guarantee of authenticity.
