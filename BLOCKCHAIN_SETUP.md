# ORBIT Protocol — Ethereum Sepolia Blockchain Setup & Architecture Guide

This guide details the complete process for deploying, configuring, testing, and interacting with the ORBIT Physical Object Digital Passport protocol on Ethereum Sepolia.

---

## 1. Architectural Division of Responsibilities

| Responsibility Layer | System | Details |
|---|---|---|
| **Authoritative Identity & Provenance** | **Ethereum Sepolia (On-Chain)** | Canonical ERC-721 token, token ownership (`ownerOf`), Keccak-256 passport hash commitment, on-chain lifecycle status, and cryptographic event hashes. |
| **Trustless Recovery Escrow** | **Ethereum Sepolia (On-Chain)** | `ORBITRecoveryEscrow.sol` holds real native ETH bounties in smart contract custody, releasing or refunding only via verified state transitions. |
| **Public Trustless Verification** | **Ethereum Sepolia (On-Chain)** | `/verify/:contractAddress/:tokenId` queries Sepolia directly via read-only JsonRpcProvider with zero dependencies on login, Firebase, or MetaMask. |
| **Hardware & Rich Lifecycle Metadata** | **Google Cloud Firestore** | Hardware images, user profiles, rich timeline descriptions, service invoices, notes, and local UI caches. |
| **Hybrid Synchronization** | **Client & Cloud** | Database mirrors update only *after* transactions are confirmed on-chain. |

---

## 2. Prerequisites & Setup

### A. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Populate your environment variables:
```env
# Frontend Sepolia Configuration
VITE_SEPOLIA_RPC_URL="https://ethereum-sepolia-rpc.publicnode.com"
VITE_CHAIN_ID="11155111"
VITE_ORBIT_PASSPORT_CONTRACT="0x..."
VITE_ORBIT_ESCROW_CONTRACT="0x..."

# Deployment Configuration (Backend/CLI only, NEVER expose to client)
SEPOLIA_RPC_URL="https://ethereum-sepolia-rpc.publicnode.com"
DEPLOYER_PRIVATE_KEY="0x..."
```

### B. Obtain Sepolia ETH
Fund your deployer and test wallets using any standard Ethereum Sepolia faucet:
- [Google Cloud Sepolia Faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia)
- [Alchemy Sepolia Faucet](https://sepoliafaucet.com)
- [Sepolia PoW Faucet](https://sepolia-faucet.pk910.de)

---

## 3. Smart Contracts & Compilation

The ORBIT Protocol consists of two contracts written in Solidity 0.8.20 with OpenZeppelin v5:
1. `contracts/ORBITPassport.sol`: ERC-721 hardware passport registry with cryptographic Keccak-256 hash anchoring and lifecycle event commitments.
2. `contracts/ORBITRecoveryEscrow.sol`: Reentrancy-guarded escrow contract holding native ETH recovery rewards with state machine (`NONE`, `LOCKED`, `RELEASED`, `REFUNDED`).

### Compile Contracts
Run the custom compiler with OpenZeppelin import resolution:
```bash
npx tsx scripts/compile-contract.ts
```
Artifacts will be generated in `src/blockchain/`:
- `src/blockchain/ORBITPassportArtifact.json`
- `src/blockchain/ORBITRecoveryEscrowArtifact.json`

---

## 4. Automated Contract Testing

Run the 30-test automated verification suite:
```bash
npx tsx scripts/test-contracts.ts
```
Verifies:
- ERC-721 standard interfaces (`mintPassport`, `ownerOf`, `safeTransferFrom`, `transferFrom`).
- Controlled passport hash updates (`setPassportHash`, `updatePassportHash`).
- Lifecycle event and status commitments (`recordLifecycleEvent`, `setObjectStatus`).
- Escrow state machine (`lockBounty`, `releaseBounty`, `refundBounty`).
- Deterministic Keccak-256 & SHA-256 cryptographic hashing.

---

## 5. Deployment to Ethereum Sepolia

Deploy both contracts with a single command:
```bash
npx tsx scripts/deploy.ts
```
The script will:
1. Validate network (Chain ID: 11155111) and deployer ETH balance.
2. Deploy `ORBITPassport.sol` to Sepolia.
3. Deploy `ORBITRecoveryEscrow.sol` linked to the passport contract.
4. Output the deployed contract addresses and transaction hashes.
5. Automatically sync addresses to `.env`.

---

## 6. End-to-End User Verification Flow

### Step 1: Connect MetaMask to Sepolia
1. Open the application.
2. Click the Persona/Wallet switcher in the top right.
3. Select **"Connect MetaMask (Injected)"**.
4. If on another network, the app prompts MetaMask to switch to **Ethereum Sepolia (Chain ID 11155111 / 0xaa36a7)**.

### Step 2: Register Object & Mint On-Chain Passport
1. Click **"Register Object"**.
2. Fill in the hardware details (or click *Auto-fill Example*).
3. Click submit. MetaMask prompts you to sign the `mintPassport(to, assetId, passportHash)` transaction.
4. Once confirmed on Sepolia, the real ERC-721 token ID and transaction hash are displayed with Sepolia Etherscan link.

### Step 3: Real ERC-721 Ownership Transfer
1. Navigate to the object passport view and click **"Transfer Ownership"**.
2. Select a recipient address (or enter a custom `0x...` Sepolia address).
3. Confirm in MetaMask. The contract executes `safeTransferFrom(from, to, tokenId)`.
4. The app verifies `ownerOf(tokenId)` on the blockchain before updating Firestore.

### Step 4: Mark LOST & Lock Real ETH Escrow Bounty
1. Click **"Mark as Lost"**.
2. Specify the ETH bounty (e.g. `0.02` ETH) and lost location.
3. Confirm transaction in MetaMask. The owner sends native ETH into `ORBITRecoveryEscrow.lockBounty(tokenId, handshakeHash)`.
4. The contract status transitions to `LOCKED`.

### Step 5: Finder Claim & Handover Confirmation
1. A finder scans the physical QR tag or submits a recovery claim without seeing owner PII.
2. A cryptographic secret handshake code is issued.
3. When physical handover takes place, the owner enters the handshake code and confirms.
4. MetaMask requests transaction confirmation for `ORBITRecoveryEscrow.releaseBounty(tokenId, finder)`.
5. Real native Sepolia ETH is automatically disbursed to the finder's wallet address.
6. The object lifecycle status on-chain is updated to `RECOVERED`.

### Step 6: Public Blockchain Verification (No Login / No Wallet Required)
1. Open the public verification URL:
   `https://<YOUR-DOMAIN>/verify/<contractAddress>/<tokenId>`
   *(or click "Public Verify" in the navigation bar)*.
2. The page uses a read-only Sepolia RPC provider to independently query:
   - Token ownership via `ownerOf(tokenId)`
   - Authoritative passport hash via `getPassportHash(tokenId)`
   - On-chain status via `getObjectStatus(tokenId)`
   - Escrow status and locked bounty amount via `getBounty(tokenId)`
3. Displays a verified checkmark (`✓ VERIFIED ON-CHAIN`) and direct links to inspect the contract, token, and transactions on Sepolia Etherscan.


## Wallet troubleshooting (error kinds shown in the UI)

| Kind | Meaning | Fix |
|---|---|---|
| METAMASK_NOT_DETECTED | No MetaMask provider found | Install/enable MetaMask for the site, reload; with several wallets make MetaMask default |
| USER_REJECTED | Popup was declined | Click the button again and approve |
| REQUEST_PENDING | A MetaMask popup is already open | Open the extension and finish it |
| WRONG_NETWORK | Wallet is not on Sepolia (11155111) | Use "Switch MetaMask to Sepolia" |
| RPC_UNAVAILABLE | Sepolia RPC failed | Set `VITE_SEPOLIA_RPC_URL` to a working endpoint |
| CONTRACT_ADDRESS_MISSING / _INVALID | `.env` address empty or malformed | Set both `VITE_ORBIT_*_ADDRESS` values and restart |
| CONTRACT_NOT_DEPLOYED | No code at the address on Sepolia | Wrong address or network |
| ABI_MISMATCH | Contract does not answer the ORBIT ABI | Redeploy or regenerate artifacts (`scripts/compile-contract.ts`) |
| INSUFFICIENT_FUNDS | Not enough Sepolia ETH | Use a faucet |
| TX_REVERTED | Contract rejected the call | Read the revert reason in the message |
| SIGNER_MISMATCH | MetaMask account differs from the ORBIT persona/token owner | Select the matching account |

## Running ORBIT locally
```bash
npm install          # uses the original package.json / bun.lock
cp .env.example .env # fill placeholders (never put private keys in VITE_ variables)
npm run dev          # node server.js -> http://localhost:3000 (Vite + API on one port, no CORS needed)
npm run lint && npm run build
npx tsx scripts/test-contracts.ts
```
The landing "Connect Web3 Wallet" button and the Navbar wallet button both open the MetaMask connect dialog until a wallet is connected on Sepolia.

## "Cannot read properties of undefined (reading 'origin')"
This TypeError is thrown inside the MetaMask extension (its background/provider code), not by ORBIT: nothing in `src/` reads `.origin` from the wallet. It typically appears when the request does not come from a normal browser tab (VS Code Simple Browser, an iframe or preview pane), after the MetaMask service worker restarts, or when several wallet extensions fight over `window.ethereum`. Fix: open `http://localhost:3000` in a regular Chrome tab, reload the page, lock/unlock MetaMask (or reload it at `chrome://extensions`), and disable other wallet extensions. ORBIT now reports this as `METAMASK_EXTENSION_ERROR` instead of a raw stack trace.

## Notifications
The bottom-right toast says "Confirmed on Ethereum Sepolia" (with an Etherscan link) only when a real transaction receipt succeeded. Wallet connections show "Wallet connected". Demo actions with no contract configured show "Local demo action (not recorded on-chain)" and never show a fabricated hash.
