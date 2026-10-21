# ORBIT Resale Marketplace

The current marketplace feature includes:

- Active resale listings with asking price in ETH
- Search and category filters
- Passport-first listing cards
- Seller listing / cancellation flow
- Buyer purchase flow
- Ownership + passport timeline update after purchase
- Demo ETH balance settlement between buyer and seller personas
- Firestore synchronization for the new owner and timeline event
- Direct navigation from an object passport to the marketplace

## Important

The marketplace UI and ownership workflow are integrated, but the payment settlement is currently a local demo state. The existing ORBITPassport ERC-721 contract can transfer ownership, but a true atomic marketplace sale requires a dedicated marketplace contract so the buyer's payment and NFT transfer happen in one transaction.

Future production step:

1. Deploy `ORBITMarketplace.sol` on Sepolia.
2. Seller approves the marketplace contract for the passport token.
3. Seller creates an on-chain listing.
4. Buyer calls `buy()` with the exact ETH price.
5. The marketplace contract transfers the NFT and payment atomically.
6. ORBIT records the marketplace transaction in the passport timeline.
