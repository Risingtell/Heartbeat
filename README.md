# ♥ Heartbeat

**Your keys shouldn't die with you.**

Heartbeat is a proof-of-life vault for crypto inheritance, built on Story's [Confidential Data Rails (CDR)](https://www.story.foundation/blog/confidential-data-rails). You encrypt your seed phrase and final wishes into an on-chain vault. You check in now and then. If you ever go silent, the people you choose can recover them — and no one, not even us, ever sees the secret.

🔗 **Live demo:** https://heartbeatvault.vercel.app
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

A single custom CDR condition contract gates both writing and reading every vault, implementing **proof-of-life gated decryption** — a permission pattern that, as far as we know, hadn't been demoed on CDR:

- **Per-vault binding** — each vault's `conditionData` is `abi.encode(owner, heir, period)`, so one owner can seal many vaults to different heirs with different windows; re-sealing never affects existing vaults.
- **Time-based release** — the heir can decrypt only after `block.timestamp ≥ lastPing + period`.
- **One heartbeat for everything** — `heartbeat()` resets the single proof-of-life clock and re-seals every vault at once; the owner stays in control.
- **Guardian multi-sig** — an optional M-of-N quorum can attest inactivity to release early, behind a **challenge window** the owner can cancel. Guardians can be added *or removed* by reconfiguring.
- **Composable** — any contract can read `isClaimable(owner, period)` / `secondsUntilClaimable(owner, period)` / `getClock(owner)`.

**On the CDR interface:** the live Aeneid CDR core invokes conditions as `check{Read,Write}Condition(uint32 uuid, bytes conditionData, bytes accessAuxData, address caller)` — selectors `0x8db3eb17` / `0x5645dbbf`, matching the deployed `LicenseReadCondition` / `OwnerWriteCondition`. Story's published docs currently show a 3-arg `(address,bytes,bytes)` shape; that is **stale** relative to what's deployed, so we reverse-engineered and matched the on-chain interface (see `scripts/find-sig*.mts`). The gate decodes the vault tuple from `conditionData`, enforces `caller == heir && claimable` on reads and `caller == owner` on writes, and **rejects any read that supplies a non-empty `accessAuxData`** — closing an argument-confusion vector. See [`contracts/DeadManSwitch.sol`](contracts/DeadManSwitch.sol) and the tests in [`test/DeadManSwitch.t.sol`](test/DeadManSwitch.t.sol).

### Security model

Access is enforced cryptographically, in three layers — not by hoping no one finds the paper:
1. **UI** hides the unlock button for non-beneficiaries (convenience only).
2. **On-chain condition** — the CDR core calls `checkReadCondition`; a non-heir (or a too-early read) reverts with *"Read condition not met."*
3. **Threshold TEEs** — the secret is split across the validator network and only reassembled when the on-chain condition passes, so there is nothing to brute-force.

Only **metadata** (that a vault exists, the heir address, the timer) is public; the contents never are.

> **Testnet note:** by design the plaintext never leaves your device, but CDR's confidentiality on the **Aeneid testnet is not production-hardened** (Story's own docs say as much). Don't seal a real, funded seed phrase here — use a throwaway secret for the demo.

## Tech stack

- **Next.js 16** (App Router, React 19, TypeScript, Tailwind v4)
- **Story Aeneid testnet** (chain `1315`) + **CDR SDK** (`@piplabs/cdr-sdk`) for client-side threshold encryption
- **`DeadManSwitch.sol`** — custom CDR condition contract (deployed to Aeneid)
- **Privy** embedded wallets (email / passkey / Google) for beneficiary onboarding
- A same-origin proxy (`/api/cdr/*`) bridges CDR's HTTP REST endpoint so the app works over HTTPS

Built on the canonical [`01-encrypt-text.ts`](https://github.com/jacob-tucker/cdr-skill/blob/main/src/01-encrypt-text.ts) pattern from `jacob-tucker/cdr-skill` (`OwnerWriteCondition` for write, threshold encryption via the CDR SDK), extended with a custom `DeadManSwitch` condition contract on top so the read side opens to a named beneficiary on a proof-of-life timer instead of always pointing at the original owner.

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

**Contract tests** (no testnet needed): install [Foundry](https://book.getfoundry.sh/) and run `forge test` — covers time release, heartbeat reset, guardian quorum + challenge window, guardian removal, per-vault independence, and the read/write/`accessAuxData` access checks.

Helper scripts (testnet): `npm run smoke` (CDR round-trip), `npx tsx scripts/dms-flow.mts` (full heir-claim flow), `npx tsx scripts/deploy.mts contracts/DeadManSwitch.sol DeadManSwitch` (compile + deploy the contract).

> **Redeploying the contract:** `DeadManSwitch.sol` is deployed to Aeneid (address in [`deployments.json`](deployments.json) and `src/lib/contract.ts`). If you change the contract, redeploy with the script above (needs `PRIVATE_KEY` + testnet IP) and update the address in **both** files.

> **`demoExpire()` is demo-only:** it lets an owner fast-forward *their own* clock so a live demo doesn't wait out the window. It's self-only and harmless, but remove it before any production deployment.

## Demo flow

1. **/vault** — connect a funded wallet → set beneficiary (email or address), pick an inactivity window, write your secret → **Seal**.
2. Dashboard → **Simulate inactivity** → copy the claim link.
3. Open the link → **sign in with the beneficiary's email** → **Unlock** → the secret is revealed.
