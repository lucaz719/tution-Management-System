# TMS Mobile (Flutter)

Role portals for Teacher, Student, Parent, Branch Admin, Tenant Admin, Janitor.
Auth is Better Auth session cookies — no tokens or tenant/branch IDs from the client.

## Environment builds

The API base URL is compile-time config (`--dart-define=API_BASE_URL`).
Release builds refuse to run without an HTTPS URL.

| Target | Command |
|---|---|
| Local (Android emulator) | `flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3001` |
| Staging | `flutter build apk --dart-define=API_BASE_URL=https://api.staging.sanskardipshikshalaya.com.np` |
| Production | `flutter build apk --dart-define=API_BASE_URL=https://api.tms.sanskardipshikshalaya.com.np` |

iOS simulator uses `http://localhost:3001`; physical devices need the machine LAN IP.

## Checks

`flutter analyze` (0 errors enforced), `flutter test` (26 tests).
CI runs both on every push to main/develop/staging/mobile-app.
