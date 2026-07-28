# connectIPS (NCHL) Gateway-Checkout Integration Guide

> A vendor-neutral, implementation-focused guide to integrating **connectIPS Core
> Module** (NCHL gateway checkout) into any merchant web app. Distilled from the
> official NCHL spec (doc.connectips.com) plus the non-obvious gotchas that cost
> real debugging time. No language assumed; examples use the spec's own sample
> merchant (`550` / `MER-550-APP-1`). Replace with your own NCHL-issued values.

---

## 0. The model in one paragraph

connectIPS gateway checkout is a **redirect + OTP + server-side validation** flow
(NOT a QR, NOT a JSON checkout, and **there is no webhook**). Your server signs a
transaction with your `.pfx` private key, the browser **POSTs a form** to the
connectIPS login page, the user logs in + enters an OTP, connectIPS **redirects
the browser back** to a URL you pre-registered (appending `?TXNID=…`), and your
server then **calls a validation REST API** to confirm the payment actually
succeeded. A redirect is *not* proof of payment — only the validation call is.

**Fee:** typically **0.75% per transaction, min Rs 2, capped at Rs 100** (confirm
your own rate + who bears it with NCHL). No integration charge.

**Amounts are always in paisa** (NPR × 100), as integers, everywhere.

---

## 1. What NCHL gives you (after NDA + KYC via your bank)

- `MERCHANTID` (integer), `APPID` (e.g. `MER-550-APP-1`), `APPNAME`
- A creditor certificate **`CREDITOR.pfx`** + its password (your signing key)
- A **Basic-Auth password** for the validation API (username = your `APPID`)
- Gateway base URL (UAT: `https://uat.connectips.com`), the login + validate paths
- You must give NCHL back: **static success + failure redirect URLs** (see §3)

---

## 2. Step 1 — Sign + POST the login form

`POST {base}/connectipswebgw/loginpage` as `application/x-www-form-urlencoded`,
submitted by a self-posting browser form.

**Fields** (mind the length limits — over-length values are rejected):

| Field | Type | Max | Notes |
|---|---|---|---|
| `MERCHANTID` | int | 20 | |
| `APPID` | string | 15 | |
| `APPNAME` | string | 30 | |
| `TXNID` | string | **20** | **unique per app per request**; this is what comes back on redirect and what you validate against |
| `TXNDATE` | string | 10 | **`DD-MM-YYYY`** |
| `TXNCRNCY` | string | 3 | `NPR` |
| `TXNAMT` | int | 20 | **paisa** |
| `REFERENCEID` | string | **20** | extra info; keep it ≤20 (a UUID is 36 — too long) |
| `REMARKS` | string | 50 | |
| `PARTICULARS` | string | 100 | |
| `TOKEN` | string | 512 | signature, below |

### 2.1 Generating `TOKEN` (the part people get wrong)
1. Build this **exact** string — field order matters and it **ends with the literal `TOKEN=TOKEN`**:
   ```
   MERCHANTID=<>,APPID=<>,APPNAME=<>,TXNID=<>,TXNDATE=<>,TXNCRNCY=<>,TXNAMT=<>,REFERENCEID=<>,REMARKS=<>,PARTICULARS=<>,TOKEN=TOKEN
   ```
2. Take the **SHA-256** digest of that string.
3. **Sign** it with the private key from `CREDITOR.pfx` using **SHA256withRSA** (= RSA PKCS#1 v1.5 with SHA-256).
4. **base64-encode** the signature → that's the `TOKEN` field value.

Python (cryptography) reference:
```python
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.serialization import pkcs12
import base64

key, _cert, _chain = pkcs12.load_key_and_certificates(pfx_bytes, pfx_password.encode())
sig = key.sign(message.encode(), padding.PKCS1v15(), hashes.SHA256())
token = base64.b64encode(sig).decode()
```
(Java: `Signature.getInstance("SHA256withRSA")` with the keystore private key, then Base64.)

---

## 3. Step 2 — Redirect handling (**STATIC URLs**, the #1 gotcha)

You register **one static `successURL` and one static `failureURL`** with the
NCHL integration team **in advance**. **There is no per-request RETURNURL field** —
any extra field you add to the form is ignored. On return, connectIPS appends
**only** `?TXNID=<txnid>` to whichever URL it sends the user to:

```
successURL:  https://yourapp.com/payment/success   →  …/success?TXNID=<txnid>   (after OTP)
failureURL:  https://yourapp.com/payment/failed    →  …/failed?TXNID=<txnid>    (on cancel/Return)
```

Because the redirect carries only `TXNID`, **your success page must look the
transaction up by TXNID**, then call the validation API. localhost URLs are
allowed during testing.

> If OTP succeeds but you get a **403 "session expired"** on redirect, your
> success/failure URLs aren't registered yet. If you get 403 after the captcha,
> the browser is blocking connectIPS cookies.

---

## 4. Step 3 — Validate (server-to-server, the source of truth)

`POST {base}/connectipswebws/api/creditor/validatetxn`

- **Basic Auth:** username = your `APPID`, password = the validate password.
- Body (JSON):
  ```json
  { "merchantId": 550, "appId": "MER-550-APP-1", "referenceId": "<TXNID>", "txnAmt": <paisa>, "token": "<base64 sig>" }
  ```
- **`referenceId` = the TXNID** you sent in the login form (gotcha #2 — *not* your
  internal order id, *not* the form's `REFERENCEID` field).
- Validate `TOKEN` message (then SHA256withRSA + base64, same key):
  ```
  MERCHANTID=<>,APPID=<>,REFERENCEID=<TXNID>,TXNAMT=<paisa>
  ```
- Response `status`: **`SUCCESS`** = paid; `FAILED` = debit/credit failed; `ERROR`
  + `TRANSACTION INCOMPLETE`/`NOT FOUND` = the user never completed it (treat as
  still-pending, retry later — not a hard failure).

**`gettxndetail`** (`…/gettxndetail`, same auth/token shape) returns richer data
incl. `chargeAmt` (the actual fee, paisa), `chargeLiability` (`CG`=customer /
`MN`=merchant), and `creditStatus` (`000`/`999`/`DEFER` = success). Use it if you
want the real fee instead of computing it.

`401` on validate/gettxndetail → wrong Basic-Auth credentials.

---

## 5. Implementation checklist

- [ ] Store `MERCHANTID/APPID/APPNAME`, the `.pfx` (base64 in an env var is handy) + its password, and the validate Basic-Auth password as **server-side secrets**.
- [ ] Persist a row per attempt with a **unique TXNID** (≤20). Map `TXNID → your order`. Store the **amount in paisa** immutably.
- [ ] Build the login form + `TOKEN` exactly per §2; auto-submit it from the browser.
- [ ] Register your **static** success + failure URLs with NCHL (§3).
- [ ] Success page: read `?TXNID=`, look up the order, call `validatetxn` with `referenceId = TXNID`, grant access **only** on `status == "SUCCESS"` and after an amount check.
- [ ] **Backstop job:** a recurring task that re-validates still-pending transactions (users who paid but closed the tab before the redirect). Without it you *will* drop real payments.
- [ ] Validate the gateway amount against your stored amount before granting anything (defend against tampering).
- [ ] Idempotent confirm: re-validating an already-granted order must be a no-op.

## 6. Pitfalls we hit (so you don't)

1. **`referenceId` ≠ your order id.** validatetxn's `referenceId` is the **TXNID** from the login form. Anything else → `TRANSACTION NOT FOUND`, and nothing ever confirms.
2. **No `RETURNURL`.** Redirect URLs are **static + pre-registered**; connectIPS only appends `?TXNID=`. Don't build a per-request return URL — it's ignored.
3. **`REFERENCEID` ≤ 20 chars.** A UUID (36) is silently over-length. Reuse the TXNID.
4. **Everything is paisa.** `TXNAMT` and validate `txnAmt` are NPR×100 integers.
5. **`TXNDATE` is `DD-MM-YYYY`**, and the token string ends with the literal `TOKEN=TOKEN`. A mismatch → invalid signature → gateway error.
6. **TXNID must be unique per request**, or you get a 403 "multiple gateway payments at once".
7. **A redirect is not a payment.** Always confirm with `validatetxn` server-side.
8. **No webhook** — plan for the closed-tab case with the backstop job (§5).

---

*Questions NCHL can't answer from docs: ask for a **test payer account** to complete OTP in UAT, and confirm your **fee rate + chargeLiability** (merchant- vs customer-borne).*
