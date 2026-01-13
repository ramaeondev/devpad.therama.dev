# E2E Tests (Playwright)

## Overview
This project uses Playwright for end-to-end tests with network stubs to make runs fast and deterministic. Tests live in `e2e/tests` and helpers are in `e2e/helpers`.

## Run locally
1. Build or serve the app:
   - For a local dev server: `npm start` (defaults to `http://localhost:4200`)
   - Or serve a production build: `npm run build && npx http-server dist/devpad/browser -p 8080`

2. Run tests:
   - `npm run test:e2e` (runs Playwright tests locally)
   - `E2E_BASE_URL` can be set to a custom URL before running, e.g. `E2E_BASE_URL=http://localhost:8080 npm run test:e2e`

## CI
A GitHub Actions workflow is added at `.github/workflows/e2e.yml` which builds and serves the site and runs `npm run test:e2e:ci`.

## Auth & Backends
- Tests are stubbed by default via `e2e/helpers/route-stubs.ts`.
- For full end-to-end (real backend) runs, set `E2E_BASE_URL` to a deployed preview and supply Supabase secrets via CI secrets; consider running a small smoke job against the real test project separately.

## Adding tests
- Put tests under `e2e/tests` and use helpers from `e2e/helpers` for consistent stubbing.
- Keep E2E tests small and focused; avoid external integrations in the initial pass.
