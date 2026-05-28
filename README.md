# ♥ Heartbeat

**Your keys shouldn't die with you.**

Heartbeat is a proof-of-life vault for crypto inheritance, built on Story's [Confidential Data Rails (CDR)](https://www.story.foundation/blog/confidential-data-rails). You encrypt your seed phrase and final wishes into an on-chain vault. You check in now and then. If you ever go silent, the people you choose can recover them — and no one, not even us, ever sees the secret.

🔗 **Live demo:** https://heartbeat-alpha-tawny.vercel.app
🏗️ Built for the **CDR Hackathon** (Story Foundation).

---

## The problem

Billions in crypto are lost forever because seed phrases vanish with their owners. You can't put a seed phrase in a will (probate is public), you can't trust a lawyer with it, and a hardware wallet in a drawer is useless if no one knows the PIN. Writing it down gives access **now**, to **whoever finds the paper**.

## What Heartbeat does

- **Seal** your recovery phrase + a message. It's encrypted **in your browser** and stored as an on-chain CDR vault — the plaintext never leaves your device.
- **Stay alive, stay sealed.** A single click is your heartbeat. As long as you check in, the vault is locked to *everyone*, including your heirs.
- **Pass it on.** If you go quiet past your chosen window — or a quorum of guardians attests — your beneficiary can finally unlock it. No lawyer, no middleman.
- **Anyone can be a beneficiary.** Heirs claim with just an **email or Google sign-in** (an embedded wallet is created and gas-funded for them automatically). Zero crypto knowledge required.

## How it works

```
Owner ──encrypt(seed) in browser──▶ CDR vault  (read gate: DeadManSwitch contract)
  │                                      ▲
  └── heartbeat() ── proof of life ──────┘   while alive → reads revert
                                              after inactivity → validator TEEs
Heir ──sign in (email)──▶ accessCDR ──────────▶ threshold-decrypt ──▶ secret
```

### The `DeadManSwitch` condition contract (Track 1)

A single custom CDR condition contract gates both writing and reading a vault, implementing **proof-of-life gated decryption** — a permission pattern that, as far as we know, hadn't been demoed on CDR:

- **Time-based release** — heir can decrypt only after `block.timestamp - lastPing ≥ period`.
- **Heartbeat** — `heartbeat()` resets the clock; the owner stays in control.
- **Guardian multi-sig** — an optional M-of-N quorum can attest inactivity to release early, behind a **challenge window** the owner can cancel.
- **Composable** — any contract can read `isClaimable(owner)` / `secondsUntilClaimable(owner)`.

CDR invokes conditions as `check{Read,Write}Condition(uint32 uuid, bytes, bytes, address caller)`; the contract reads the owner from the condition data and enforces `caller == heir && claimable` on reads and `caller == owner` on writes. See [`contracts/DeadManSwitch.sol`](contracts/DeadManSwitch.sol).

### Security model

Access is enforced cryptographically, in three layers — not by hoping no one finds the paper:
1. **UI** hides the unlock button for non-beneficiaries (convenience only).
2. **On-chain condition** — the CDR core calls `checkReadCondition`; a non-heir (or a too-early read) reverts with *"Read condition not met."*
3. **Threshold TEEs** — the secret is split across the validator network and only reassembled when the on-chain condition passes, so there is nothing to brute-force.

Only **metadata** (that a vault exists, the heir address, the timer) is public; the contents never are.

## Tech stack

- **Next.js 16** (App Router, React 19, TypeScript, Tailwind v4)
- **Story Aeneid testnet** (chain `1315`) + **CDR SDK** (`@piplabs/cdr-sdk`) for client-side threshold encryption
- **`DeadManSwitch.sol`** — custom CDR condition contract (deployed to Aeneid)
- **Privy** embedded wallets (email / passkey / Google) for beneficiary onboarding
- A same-origin proxy (`/api/cdr/*`) bridges CDR's HTTP REST endpoint so the app works over HTTPS

## Run it locally

```bash
npm install --legacy-peer-deps      # Privy/wagmi peer ranges
cp .env.example .env                # then fill in the values below
npm run dev                         # http://localhost:3000
```

Environment variables (`.env`):

| Var | Purpose |
|-----|---------|
| `NEXT_PUBLIC_PRIVY_APP_ID` | Privy app id (public) |
| `PRIVY_APP_SECRET` | Privy server SDK — pre-provision heir wallets |
| `RELAYER_PRIVATE_KEY` | Testnet key that gas-funds new embedded wallets |
| `CDR_API_URL` | CDR Story-API REST base (proxied) |

Helper scripts (testnet): `npm run smoke` (CDR round-trip), `npx tsx scripts/dms-flow.mts` (full heir-claim flow), `npx tsx scripts/deploy.mts contracts/DeadManSwitch.sol DeadManSwitch` (compile + deploy a contract).

## Demo flow

1. **/vault** — connect a funded wallet → set beneficiary (email or address), pick an inactivity window, write your secret → **Seal**.
2. Dashboard → **Simulate inactivity** → copy the claim link.
3. Open the link → **sign in with the beneficiary's email** → **Unlock** → the secret is revealed.
