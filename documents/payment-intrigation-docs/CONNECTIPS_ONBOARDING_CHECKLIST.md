# connectIPS (NCHL) — what to ask for on Monday

A precise, forward-able checklist for the bank / NCHL integration visit. Our integration is **built
and waiting** — once these values arrive, it's a config-only plug-in (no code changes). Everything
maps to a `CONNECTIPS_*` server secret on our side.

> Context for NCHL: we're integrating **connectIPS gateway checkout** (the redirect + OTP + server-
> side `validatetxn` flow) into our web app for one-time subscription payments. We need **UAT (test)
> first**, then production.

---

## 1. Ask NCHL / the bank to PROVIDE us (the credentials)

| # | What to ask for | Maps to our config | Notes |
|---|---|---|---|
| 1 | **MERCHANTID** (integer) | `CONNECTIPS_MERCHANT_ID` | their merchant id for us |
| 2 | **APPID** (e.g. `MER-550-APP-1`) | `CONNECTIPS_APP_ID` | also the validate-API username |
| 3 | **APPNAME** | `CONNECTIPS_APP_NAME` | |
| 4 | **The creditor certificate `CREDITOR.pfx`** + **its password** | `CONNECTIPS_PFX_BASE64` (we base64 the file) + `CONNECTIPS_PFX_PASSWORD` | the signing key — keep it secret, send securely, NOT over plain email if avoidable |
| 5 | **The validation-API password** (Basic-Auth, username = APPID) | `CONNECTIPS_VALIDATE_PASSWORD` | distinct from the .pfx password |
| 6 | **The UAT (test) base URL** and the **production base URL** | `CONNECTIPS_BASE_URL` | confirm both — we default UAT to `https://uat.connectips.com` |
| 7 | **A UAT test payer account** (bank login + OTP) | — | so we can actually complete a test payment in UAT. Ask explicitly — it's not always given by default. |

**Two sets of these will arrive at different times:** a **TEST/UAT** set now-ish (Monday), then a
**LIVE** set after UAT is verified. We swap test→live by changing config only.

---

## 2. GIVE NCHL these from us (they must pre-register them)

connectIPS has **no per-request return URL** — it only redirects to **static URLs you register in
advance**, appending `?TXNID=`. Give them **exactly** these two (must match our live domain):

- **Success URL:** `https://nurvexalabs.com/payment/success`
- **Failure URL:** `https://nurvexalabs.com/payment/failed`

> If we end up testing on a different/staging domain first, we'll also need those URLs registered for
> UAT (localhost URLs are allowed in UAT — ask if they want one).

---

## 3. CONFIRM with them (avoids surprises)

- [ ] **Fee rate + who bears it** — typically **0.75%/txn, min Rs 2, capped Rs 100**; confirm our exact
  rate and whether it's **merchant-borne or customer-borne** (`chargeLiability` CG=customer / MN=merchant).
- [ ] **The exact validate path** — we use `/connectipswebws/api/creditor/validatetxn` (and optionally
  `/gettxndetail` for the real fee). Confirm these are current for our account.
- [ ] **Any IP allow-listing** required for the server-side validate calls.
- [ ] **Settlement timing** (when money actually reaches the merchant bank account).
- [ ] **NDA + KYC** — confirm what paperwork the bank needs from us to issue the live credentials.

---

## 4. What we DON'T need to ask (already handled)

- No webhook — connectIPS doesn't have one; we built a **backstop re-validation job** for the
  closed-tab case (user pays but closes the tab before redirect).
- Token signing (SHA256withRSA over the exact field string), TXNID ≤20 chars, paisa amounts, the
  `referenceId = TXNID` validate gotcha — all implemented to their spec.

---

## 5. The moment the values arrive (our side, ~minutes)

1. `base64` the `CREDITOR.pfx` → set `CONNECTIPS_PFX_BASE64` (+ the two passwords) as **secrets**.
2. Set `CONNECTIPS_MERCHANT_ID / APP_ID / APP_NAME`, and `CONNECTIPS_BASE_URL` to the UAT base.
3. Flip the admin **ConnectIPS** toggle on.
4. Run one UAT payment end-to-end with the test payer account → confirm activation + receipt.
5. Swap to the live base URL + live PFX → go live.
