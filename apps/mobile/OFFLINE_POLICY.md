# Offline Policy (MOB-007)

Identity authority: **Better Auth session cookies are the only identity
authority.** The offline layer never authenticates, never stores credentials,
and never decides who a user is.

## Conflict rule: server wins

When a queued offline mutation is replayed and the server rejects it as
stale (HTTP 409, version mismatch, or equivalent):

1. The local mutation is **dropped** — the server copy stays authoritative.
2. A `SyncConflict` is recorded and surfaced via `SyncStatus.conflicts`.
3. The UI **must notify the user** (e.g. "Your offline change to X was
   overwritten by newer server data") and offer a path to re-apply manually.
4. The queue **never** force-pushes over the server (no last-write-wins
   from the client, no blind overwrite).

Normal replay is FIFO per user and stops at the first retryable failure to
preserve ordering (later ops may depend on earlier ones).

## What MAY be cached offline

- Task / entity list + detail payloads (read models) for the current user.
- Pending mutations in `sync_queue` (method + path + body + idempotency key).
- Non-sensitive UI prefs already in `SharedPreferences` (theme, last route).

All cached rows are scoped by `ownerUserId`. Cache reads always filter by
the current user id; cross-user reads are impossible by construction.

## What must NEVER be cached offline

- Passwords (plain or hashed) — never touch the device store.
- Better Auth session cookies / tokens — owned exclusively by `ApiClient`'s
  cookie jar; the offline DB has no column for them by design.
- Other users' data — per-user scoping only, no shared/global cache rows.
- Anything the server marks non-cacheable (e.g. 2FA challenges, one-time
  codes) — always online-only.

## Wipe rules

- `clearOfflineCache(userId)` wipes **all** `sync_queue` + `entity_cache`
  rows for that user. The network owner calls it from
  `ApiClient.clearAuth`-equivalent flows (logout + 401 interceptor).
- Until wired, the call is a safe deferred no-op: the user id is remembered
  and wiped when the database registers via `registerOfflineDatabase`.
- App startup registers the DB once: `registerOfflineDatabase(AppDatabase())`
  and overrides `syncQueueServiceProvider` / `syncCurrentUserIdProvider`.

## Connectivity choice

Socket-check (TCP connect to the API host, 3s timeout, 15s poll) instead of
`connectivity_plus`: it proves *usable* connectivity (Wi-Fi icon ≠ working
internet), needs no native plugin (works on desktop CI), and is faked in
tests via `connectivityCheckOverrideProvider`.
