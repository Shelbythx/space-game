# Frontend

React, TypeScript, MUI, i18next, React Router (D43), built with Vite into a static site for
GitHub Pages (D61). The frontend only shows results; every number comes from the backend
(D59) through the contract in [`docs/api.md`](../docs/api.md).

## Run

```bash
npm install
cp .env.example .env.local   # set VITE_API_URL to the backend
npm run dev                  # http://localhost:5173
```

`npm run build` type-checks and builds into `dist/`; `npm run lint` runs oxlint.

## Layout

| Path | What |
| --- | --- |
| `src/api/types.ts` | Contract types, hand-written from `docs/api.md` until the backend publishes OpenAPI |
| `src/api/client.ts` | Typed API client; base URL from `VITE_API_URL` |
| `src/api/useServerWake.ts` | Wakes the sleeping backend and reports its state |
| `src/i18n/` | English (main) and Ukrainian texts; backend message codes are keys here |
| `src/lib/storage.ts` | Guarded `localStorage`, anonymous `playerId` |
| `src/theme.ts` | Blueprint theme (D54) |
| `src/pages/` | Screens |

Routing uses `HashRouter` and a relative `base`, so the build runs under any path without
server rewrites.
