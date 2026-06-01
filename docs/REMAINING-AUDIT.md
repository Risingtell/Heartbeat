# Remaining audit — checks that need the live system

The Foundry suite (`forge test`, 11 tests) proves the **contract logic** deterministically, and
`tsc`/`next build` cover the frontend. The items below **cannot** be verified statically — they
need the redeployed contract, the live CDR validator network, Privy's service, and the production
Vercel environment. Work top-down; #1, #3, and #8 are the ones where a "works in the demo" project
quietly breaks.

> Legend — **What** to verify · **How** · **Risk** if skipped.

## A. Live CDR integration (the real unknowns)

The unit tests call `checkReadCondition` *directly* with the assumed argument layout. They do **not**
prove how the deployed CDR core invokes the condition, nor that threshold decryption round-trips.

- [ ] **1. End-to-end claim round-trips.** Run `npx tsx scripts/dms-flow.mts` (needs `PRIVATE_KEY`
  + Aeneid IP). The decisive line is **step 6** (`heir.accessCDR()`) — it goes through the CDR core
  + validator TEEs, so success means the gate is actually wired.
  *Risk:* the entire "enforced by cryptography" claim is unproven against the live network. Most important check.

- [ ] **2. Argument order / `conditionData` size.** The contract is **order-agnostic** (reads the one
  non-empty `bytes` arg; rejects when both are non-empty), so honest reads work regardless of whether
  the core passes `conditionData` 2nd or 3rd. What a live run confirms: the core accepts a **96-byte**
  `conditionData` at `allocate` (old design was 32 bytes) and passes empty `accessAuxData`. The
  `dms-flow.mts` round-trip confirms both implicitly.

- [ ] **3. Negative gating in the TEEs, not just the view.** `dms-flow.mts` step **4c** now attempts a
  real `accessCDR` *before* expiry and asserts it is rejected — proving the validators refuse, not just
  that the on-chain view returns false.
  *Risk:* a gap where the view says "sealed" but the validators still serve partials.

- [ ] **4. CDR API endpoint reachability from production.** `http://172.192.41.96:1317` is proxied via
  `/api/cdr/*`. Confirm the proxy works on Vercel (server-side fetch to plain HTTP from a serverless
  function) and that the IP is currently up.

- [ ] **5. Read fee + gas economics.** `cdr-smoke.mts` reads `getReadFee()`; confirm on live whether the
  heir's read needs a fee beyond gas, and that the relayer's **0.5 IP** top-up
  (`src/app/api/provision/route.ts`) actually covers it.

## B. Contract deployment & explorer

- [ ] **6. Redeploy + sync addresses.** `scripts/deploy.mts` only deploys (no verification step). After
  deploy, update **both** `deployments.json` and `src/lib/contract.ts`, and remove any reference to the
  old contract so nothing points at the stale ABI.

- [ ] **7. Source verification on the explorer.** Storyscan is a Blockscout instance (supports
  standard-JSON source verification), but `deploy.mts` doesn't do it. Verify the redeployed
  `DeadManSwitch` source so judges can read it. (Confirm the exact Blockscout verify method for Aeneid.)
  *Risk:* a Track-1 judge can't read the contract and may assume the worst.

## C. Privy / beneficiary onboarding (external service)

- [ ] **8. Embedded-wallet determinism across sign-in.** `provision/route.ts` pre-creates a wallet
  server-side via `importUser`. The claim model assumes that when the beneficiary later signs in with
  the same email, Privy hands them control of the **same address** set as `heir`. This depends on the
  Privy app config (embedded-wallet recovery / self-custody mode). **Test live:** provision an email,
  then in a fresh browser sign in with it and confirm the connected address equals `heir` and can submit
  the unlock tx.
  *Risk:* heirs sign in to a *different* address than the vault is gated to → can never unlock. High impact.

- [ ] **9. Re-provisioning an existing Privy user.** Confirm `getUserByEmail`/`importUser` for an email
  that already has an account returns the existing wallet (no duplicate).

## D. Production frontend runtime

- [ ] **10. Deployed-site smoke test of the new flow.** Local `next build` failed only on a missing
  `NEXT_PUBLIC_PRIVY_APP_ID` (env, not code). On the deployed site, walk: seal a vault → dashboard shows
  `getClock` status + per-vault countdown → copy the claim link → confirm it carries `&heir=…&period=…`
  → open it in another browser, sign in as the heir, unlock after `demoExpire`. Exercises every changed
  file together.

- [ ] **11. Old claim links / old vaults.** Vaults sealed against the old contract are orphaned (different
  ABI + 32-byte conditionData). Decide whether to surface this in the UI or start fresh for the demo.

## Already verified (don't re-audit)

- Contract + tests compile; **11/11 Foundry tests pass** (incl. `accessAuxData` injection, guardian
  removal, per-vault independence).
- `tsc --noEmit` clean; `next build` compiles + passes TypeScript.
- Selector math + `scripts/find-sig2.mts` labels confirm the deployed CDR reference contracts
  (`LicenseReadCondition` / `OwnerWriteCondition`) use `(uint32,bytes,bytes,address)` — the interface the
  contract targets (selectors `0x8db3eb17` / `0x5645dbbf`).
