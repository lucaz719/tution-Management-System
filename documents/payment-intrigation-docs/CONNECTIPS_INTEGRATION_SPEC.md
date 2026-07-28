# connectIPS (NCHL) Integration — Authoritative Spec & Status

> Reference copy of the official NCHL **connectIPS Core Module** merchant
> integration spec (doc.connectips.com), the UAT config, our implementation
> status, and the gaps that must be closed before UAT. Secrets (passwords, the
> `.pfx`) are **never** in this file — they live only in Coolify env vars (and a
> local secure note). Source: NCHL email to Ednep Abhiyan, 2026‑04‑06.

---

## 0. Quick facts

| Item | Value |
|---|---|
| Provider | Nepal Clearing House Ltd. (NCHL), product **connectIPS** |
| Model | **Gateway checkout** (browser POST → OTP → redirect → server-side validate) |
| Transaction fee | **0.75% per txn, min Rs 2, up to Rs 100** — i.e. `clamp(0.75%·amount, 2, 100)` |
| Integration charge | None |
| Amounts | **Always in paisa** (NPR ×100), integers, in the gateway form + validate API |
| Confirm model | **No webhook.** Merchant calls a `validatetxn` REST API on redirect-back (and via our backstop cron). |
| Environment | UAT (`uat.connectips.com`) until certified, then production base URL |

---

## 1. UAT configuration (env vars — values in Coolify, NOT here)

| Env var | Meaning | UAT value location |
|---|---|---|
| `CONNECTIPS_MERCHANT_ID` | Merchant ID (`4153`) | config (not secret) |
| `CONNECTIPS_APP_ID` | App ID `MER-4153-APP-1` (also Basic-Auth username) | config |
| `CONNECTIPS_APP_NAME` | `Ednep Abhiyan` | config |
| `CONNECTIPS_PFX_B64` | base64 of `CREDITOR.pfx` | **secret** |
| `CONNECTIPS_PFX_PASSWORD` | pfx password | **secret** |
| `CONNECTIPS_BASIC_AUTH_PASSWORD` | password for `validatetxn` Basic Auth | **secret** |
| `CONNECTIPS_GATEWAY_URL` | `https://uat.connectips.com/connectipswebgw/loginpage` | config |
| `CONNECTIPS_VALIDATE_URL` | `https://uat.connectips.com/connectipswebws/api/creditor/validatetxn` | config |
| `CONNECTIPS_ENABLED` | `true` to leave the 503 stub and go live | flag |

Doc portal `doc.connectips.com` and the optional `gettxndetail` endpoint
(`…/connectipswebws/api/creditor/gettxndetail`) are noted in the secure creds note.

To produce `CONNECTIPS_PFX_B64`: `base64 -w0 CREDITOR.pfx` (or `base64 -i CREDITOR.pfx | tr -d '\n'` on macOS).

---

## 2. Gateway login (step 1 — browser POST)

`POST https://{base}/connectipswebgw/loginpage` — `application/x-www-form-urlencoded`.
The browser submits a self-posting form; connectIPS shows the login/OTP page.

| # | Field | Type | Max | Notes |
|---|---|---|---|---|
| 1 | `MERCHANTID` | int | 20 | from NCHL |
| 2 | `APPID` | string | 15 | from NCHL |
| 3 | `APPNAME` | string | 30 | merchant/app name |
| 4 | `TXNID` | string | **20** | **unique per app per request**; used for reconciliation; this is what comes back on redirect |
| 5 | `TXNDATE` | string | 10 | **`DD-MM-YYYY`** |
| 6 | `TXNCRNCY` | string | 3 | `NPR` |
| 7 | `TXNAMT` | int | 20 | **paisa** |
| 8 | `REFERENCEID` | string | **20** | extra info; returned as `refId` |
| 9 | `REMARKS` | string | 50 | |
| 10 | `PARTICULARS` | string | 100 | |
| 11 | `TOKEN` | string | 512 | base64 RSA signature (below) |

### 2.1 TOKEN generation
1. Build the message string **in this exact field order**, ending with the literal `TOKEN=TOKEN`:
   ```
   MERCHANTID=<>,APPID=<>,APPNAME=<>,TXNID=<>,TXNDATE=<>,TXNCRNCY=<>,TXNAMT=<>,REFERENCEID=<>,REMARKS=<>,PARTICULARS=<>,TOKEN=TOKEN
   ```
2. SHA‑256 digest of that string.
3. Sign with the creditor private key (from `CREDITOR.pfx`); algorithm **SHA256withRSA** (RSA PKCS#1 v1.5 + SHA‑256).
4. **base64‑encode** the signature → the `TOKEN` field.

> Our `connectips.py::_sign` does exactly `base64(private_key.sign(msg, PKCS1v15(), SHA256()))`. ✅ matches.

---

## 3. User redirection (step 2 — **STATIC URLs**, the part most teams get wrong)

- The merchant registers **one static `successURL` and one static `failureURL`** with the connectIPS integration team **ahead of time**. There is **no per‑request RETURNURL field** — anything extra in the form is ignored.
- On return, connectIPS appends **only** `?TXNID=<txnid>` to whichever URL it redirects to.
  - `successURL` — after the user enters OTP (transaction created).
  - `failureURL` — user clicks **Return** / **Return to Creditor Site** (cancel).
- localhost URLs are allowed during testing. Provide the **full** URL.

```
successURL: https://<frontend-domain>/student/enroll/success      → connectIPS calls .../success?TXNID=<txnid>
failureURL: https://<frontend-domain>/student/enroll/failed       → .../failed?TXNID=<txnid>
```

> ⚠️ Redirect to a static URL with `?TXNID=` means **the return handler must look the payment up by TXNID**, then call `validatetxn`. A redirect status is NOT proof of payment — always validate server‑side.

---

## 4. Payment validation (step 3 — server‑to‑server, the source of truth)

`POST https://{base}/connectipswebws/api/creditor/validatetxn`

- **Basic Auth:** username = `APPID`, password = `CONNECTIPS_BASIC_AUTH_PASSWORD`.
- Body (JSON):
  ```json
  { "merchantId": 4153, "appId": "MER-4153-APP-1", "referenceId": "<TXNID>", "txnAmt": <paisa>, "token": "<base64 sig>" }
  ```
- **`referenceId` = the TXNID** sent in the login form (NOT the merchant `REFERENCEID` field, NOT any internal id).
- Validate TOKEN message (then SHA256withRSA + base64, same key):
  ```
  MERCHANTID=<>,APPID=<>,REFERENCEID=<TXNID>,TXNAMT=<paisa>
  ```
- Response `status`: **`SUCCESS`** = paid; `FAILED` = debit/credit failed; `ERROR` + `TRANSACTION INCOMPLETE`/`NOT FOUND` = user never completed (treat as still‑pending, not a hard fail).

### 4.1 `gettxndetail` (optional, richer)
Same auth/token shape at `…/gettxndetail`. Adds `chargeAmt` (paisa, the **actual** fee), `chargeLiability` (`CG`=customer / `MN`=merchant), `creditStatus` (`000`/`999`/`DEFER` = success). Use this if we want the real fee instead of computing 0.75% ourselves.

---

## 5. Exception handling (from §7 of the docs)
- **403 after captcha** → browser blocking connectIPS cookies.
- **403 after OTP** → redirect URLs not registered (do §3).
- **401 on validate/gettxndetail** → wrong Basic-Auth creds.
- **Values over the length limits** (§2) → rejected — keep TXNID/REFERENCEID ≤ 20.
- **Duplicate TXNID in a session** → 403 "multiple gateway payments at once". TXNID must be unique per request.

---

## 6. Our implementation status (`apps/payments/`)

**Already built & spec‑correct:** PFX load + SHA256withRSA + base64 signing (`connectips.py::_sign`); the login‑form TOKEN message order incl. `TOKEN=TOKEN`; `TXNAMT` in paisa; `TXNDATE` `DD-MM-YYYY`; `TXNID` = first 20 hex chars of the payment UUID (≤20, unique); validate TOKEN message format; Basic-Auth (user=appId); `confirm_payment` single idempotent grant path; the closed‑tab backstop (`revalidate_stale_connectips_payments` + `manage.py revalidate_pending_connectips`).

**⚠️ Gaps to close before UAT — see §7.**

---

## 7. Gaps vs spec (found auditing our code 2026‑06‑27) → "Pass 6"

| # | Sev | Gap | Fix |
|---|---|---|---|
| 1 | **BLOCKER** | `validate_payment` is called with `referenceId = str(payment.id)` (UUID) in `validate_and_confirm_connectips_payment` **and** the backstop. Spec requires `referenceId = TXNID`. → connectIPS returns NOT FOUND, **nothing ever confirms**. | Pass `reference_id = cips_tx.txnid` in both call sites (payload + signed token both follow). |
| 2 | **BLOCKER** | Redirect uses a `RETURNURL` form field + success page reads `?payment_id=`. Real connectIPS ignores RETURNURL and redirects to **static** URLs with `?TXNID=`. | Register static success/failure URLs; drop RETURNURL from both connectIPS forms; success page reads `?TXNID=` and validates by txnid; add `/student/enroll/failed`. Resolve `ConnectIPSTransaction` by `txnid` (with owner check). |
| 3 | **HIGH** | Login‑form `REFERENCEID` = `str(payment.id)` (36 chars) exceeds the 20‑char limit → may be rejected. | Set form `REFERENCEID` to the txnid (≤20). |
| 4 | **MEDIUM** | `fees.compute_fee` is percent‑only; real fee = `clamp(0.75%, min Rs 2, max Rs 100)`. Affects `net_amount` reporting only (fee is absorbed). | Add min/max to the `payment_processing_fees` setting, **or** read `chargeAmt` from `gettxndetail`. |

---

## 8. Go‑live runbook (UAT → prod)

1. **Founder → NCHL:** register the static success + failure URLs (§3) for the deployed `FRONTEND_URL`.
2. **Code:** ship Pass 6 (close §7 gaps).
3. **Coolify env:** set the 8 `CONNECTIPS_*` vars (§1) + `CONNECTIPS_ENABLED=true`. `CONNECTIPS_PFX_B64` = base64 of `CREDITOR.pfx`.
4. **Cron:** add a Coolify scheduled task running `python manage.py revalidate_pending_connectips` every ~5 min (closed‑tab backstop).
5. **UAT:** make a test payment end‑to‑end (initiate → OTP → redirect `?TXNID=` → validate → enroll). Confirm the receipt + admin gross/fee/net.
6. **Prod:** swap UAT base URLs + creds for production, re‑register prod success/failure URLs, re‑run a smoke payment.
