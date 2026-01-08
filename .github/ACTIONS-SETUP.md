# GitHub Actions CI/CD Setup

This repository uses GitHub Actions for continuous integration and deployment.

## Workflow Overview

The CI/CD pipeline includes the following jobs:

1. **Lint** - Code quality checks
   - Prettier formatting check
   - TypeScript compilation check

2. **Test** - Unit tests
   - Runs unit tests with **Jest**
   - Generates code coverage report
   - Uploads coverage to Codecov (optional)

3. **Build** - Production build
   - Builds the Angular application for production
   - Uploads build artifacts

4. **Deploy** - Vercel deployment (master/main branch only)
   - Deploys to production on Vercel
   - Comments on PRs with deployment URL

## Required GitHub Secrets

To enable the full CI/CD pipeline, add the following secrets to your GitHub repository:

### Vercel Secrets (Required for Deployment)

1. **VERCEL_TOKEN**
   - Get it from: https://vercel.com/account/tokens
   - Create a new token with appropriate permissions

2. **VERCEL_ORG_ID**
   - Found in: `.vercel/project.json` after running `vercel link`
   - Or in Vercel dashboard → Settings → General

3. **VERCEL_PROJECT_ID**
   - Found in: `.vercel/project.json` after running `vercel link`
   - Or in Vercel dashboard → Settings → General

### Optional Secrets

4. **CODECOV_TOKEN** (Optional)
   - Only needed if you want to upload coverage reports to Codecov
   - Get it from: https://codecov.io/

## How to Add Secrets

1. Go to your GitHub repository
2. Navigate to: Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Add each secret with its corresponding value

## Getting Vercel Credentials

Run these commands locally to get your Vercel credentials:

```bash
# Install Vercel CLI (if not already installed)
npm install -g vercel

# Link your project (if not already linked)
vercel link

# View your credentials
cat .vercel/project.json
```

The output will show your `orgId` and `projectId`.

## Manual Deployment

You can still deploy manually using:

```bash
vercel --prod
```

## Workflow Triggers

- **Push to master/main**: Runs full pipeline including deployment
- **Pull Requests**: Runs lint, test, and build (no deployment)

## Branch Protection (Recommended)

Consider enabling branch protection rules:

1. Go to Settings → Branches → Add rule
2. Branch name pattern: `master` or `main`
3. Enable:
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
   - Select status checks: `Lint`, `Test`, `Build`

This ensures all checks pass before merging PRs.
