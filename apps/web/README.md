# TMS Web (React + TypeScript + webpack)

The web frontend for the Tuition Management System. Pure React 19 with TypeScript, bundled by webpack 5 (`ts-loader`), linted with Oxlint.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Starts `webpack-dev-server` in development mode and opens the browser. |
| `npm run build` | Typechecks (`tsc -b`) then produces a production bundle with webpack. |
| `npm run lint` | Runs Oxlint over the source. |

## Structure

- `src/main.tsx` — entry point; global styles come from `src/index.css` and `src/pages/auth/auth.css`.
- `src/features/auth/` — authentication service layer (API-backed; talks to `services/api`).
- `src/context/AuthContext.tsx` — session state, persistence, and role-based routing.
- `src/pages/` — route-level screens per role (super admin, tenant, branch, teacher, staff, student, parent).
- `webpack.config.*` — bundler configuration; no Vite is used in this app.

The API server is expected at `http://localhost:3001/api` (see `src/services/api.ts`).
