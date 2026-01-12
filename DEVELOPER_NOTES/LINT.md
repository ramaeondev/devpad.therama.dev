CI lint behavior

- On pull requests: CI lints only changed `.ts` and `.html` files and will skip lint if there are no TS/HTML changes. This prevents the existing codebase from blocking PRs while ensuring new/changed files meet lint rules (`--max-warnings=0`).

- On pushes (branches/master): CI runs a full lint across the codebase.

Notes:
- ESLint and Prettier were added; a `lint` job was added to `.github/workflows/ci-cd.yml` and `lint` is required before `Deploy-Production`.
- I updated `package-lock.json` to include the new devDependencies and added `tsconfig.eslint.json` to scope ESLint to project files.
- Local verification: `npm ci`, `npm run lint` (changed-file mode showed results), unit tests, and `npm run build` passed locally. There was a bundle size budget warning during build (initial bundle ~722 kB > 500 kB budget).

If you prefer stricter enforcement (run full lint on PRs), I can flip the workflow to run full lint on PRs and then help fix or autofix existing issues incrementally.
