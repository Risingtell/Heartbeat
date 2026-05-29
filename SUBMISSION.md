# Heartbeat — Hackathon Submission

**Your keys shouldn't die with you.**

Tracks: **Best CDR Application** *and* **Technical Implementation**
Live demo: **https://heartbeatvault.vercel.app**
Code: **https://github.com/Risingtell/Heartbeat**
Built on: **Story Aeneid testnet · Confidential Data Rails**

## Elevator pitch
Heartbeat is a proof-of-life vault for crypto inheritance. You encrypt your seed phrase and final wishes into an on-chain CDR vault and check in periodically. If you ever go silent, the people you choose can recover them — enforced by cryptography, not trust. No lawyer, no middleman, and the plaintext never leaves your browser.

## The problem
Billions in crypto are lost forever because seed phrases vanish with their owners. A will can't hold a seed (probate is public), a lawyer can't be trusted with it, and a note in a drawer gives access *now* to whoever finds it. There's no safe way to pass on self-custodied assets — until the data itself can carry conditional, time-aware access logic. That's exactly what CDR makes possible.

## What it does
- **Seal** your recovery phrase + a message. Encryption happens in the browser; the vault's read access is gated by a custom on-chain condition.
- **Stay alive, stay sealed.** A one-click `heartbeat()` is your proof of life. While you check in, the vault is locked to *everyone*, including your heirs.
- **Pass it on.** After your chosen inactivity window — or an optional guardian quorum + challenge window — your beneficiary can unlock it.
- **Anyone can inherit.** Beneficiaries claim with just **email or Google sign-in**; an embedded wallet is created and gas-funded for them automatically.

## How it works
```
Owner ─ encrypt(seed) in browser ─▶ CDR vault (read gate = DeadManSwitch)
  └─ heartbeat() ─ proof of life ──┘   alive → reads revert
                                        silent → validator TEEs threshold-decrypt
Heir ─ sign in (email) ─ accessCDR ─────▶ secret revealed
```

## Track 1 — Technical Implementation
A single custom CDR condition contract, [`DeadManSwitch.sol`](contracts/DeadManSwitch.sol), gates both writing and reading a vault and implements a permission pattern we hadn't seen demoed on CDR: **proof-of-life gated decryption.**

- **Advanced, dynamic conditions:** time-based release (`block.timestamp − lastPing ≥ period`), an optional **M-of-N guardian multi-sig** to attest inactivity, and a **challenge window** the owner can cancel — time-based + multi-sig + multi-step in a single contract.
- **Smart-contract-enforced access:** the CDR core calls `check{Read,Write}Condition(uint32 uuid, bytes, bytes, address caller)`; the contract enforces `caller == heir && claimable` on reads and `caller == owner` on writes. We reverse-engineered this exact interface from the deployed conditions (it isn't documented) — see [`scripts/find-sig2.mts`](scripts/find-sig2.mts) and [`scripts/selectors.mts`](scripts/selectors.mts).
- **Composable:** any contract can read `isClaimable(owner)` / `secondsUntilClaimable(owner)` to build on top of a Heartbeat vault.
- **Trustless end to end:** the secret is split across the validator TEE network and only reassembled when the on-chain condition passes — proven by a full owner→heir claim test on Aeneid (see [`scripts/dms-flow.mts`](scripts/dms-flow.mts)).

## Track 2 — Best CDR Application
- **A product people would actually use.** Crypto inheritance is an unsolved, emotionally urgent problem. The flow is end-to-end and the design is calm and trustworthy.
- **The killer UX detail.** Beneficiaries need *zero* crypto knowledge — email/Google sign-in creates and funds their wallet automatically (Privy embedded wallets + a gas relayer). This is what makes inheritance realistic for non-crypto family members.
- **Polish.** Live HTTPS deployment, shareable claim links, live countdowns, a "sealed" confirmation screen, and a built-in demo mode so the release can be shown live on stage.
- **Open and shippable.** Public repo, public deployment, dead-simple env setup.

## Security model
Access is enforced cryptographically, in three layers:
1. **UI** hides the unlock button for non-beneficiaries — convenience only.
2. **On-chain condition** — the CDR core calls `checkReadCondition`; a non-heir (or a too-early read) reverts with *"Read condition not met."*
3. **Threshold TEEs** — the secret is split across the validator network and only reassembled when the on-chain condition passes, so there is nothing to brute-force.

Only **metadata** (that a vault exists, the heir address, the timer) is public; the contents never are.

## Tech stack
Next.js 16 / React 19 / TypeScript / Tailwind v4 · `@piplabs/cdr-sdk` (client-side threshold encryption) · custom `DeadManSwitch` Solidity condition contract on Aeneid · Privy embedded wallets (email/passkey/Google) for beneficiary onboarding · a same-origin proxy (`/api/cdr/*`) bridging CDR's HTTP REST so the app runs over HTTPS.

## What's next
- **Email-native owner onboarding** (gas-sponsored), so neither side needs a wallet.
- **Minor beneficiaries** — name a custodian or guardian quorum, with an optional **age/time lock** ("release only after 2035") layered on the dead-man trigger.
- **Encrypted document vaults** (wills, instructions) via CDR file storage.

## Built by
Rising Technology — for the Story Foundation CDR Hackathon.
