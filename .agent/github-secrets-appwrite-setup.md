# GitHub Secrets Setup for Appwrite

## ✅ Updated Files
- `.github/workflows/ci-cd.yml` - Added Appwrite environment variables

## 📋 Required GitHub Secrets

You need to add these secrets to your GitHub repository:

### Appwrite Secrets (Missing)
1. `APPWRITE_API` - Your Appwrite endpoint URL
2. `APPWRITE_PROJECT_ID` - Your Appwrite project ID
3. `APPWRITE_DB_READ_ONLY_API_KEY` - Read-only API key for database access
4. `APPWRITE_DATABASE_ID` - Your database ID (e.g., `devpad_main`)

### Existing Secrets (Should already be set)
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `VERCEL_TOKEN`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_API_KEY`
- `GOOGLE_APPID`
- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_REDIRECT_URI`

## 🔧 How to Add GitHub Secrets

### Step 1: Get Your Appwrite Values

1. **Go to Appwrite Console**: https://cloud.appwrite.io/console
2. **Select your project**
3. **Get the values**:
   - **APPWRITE_API**: Click **Settings** → Copy **API Endpoint** (e.g., `https://cloud.appwrite.io/v1`)
   - **APPWRITE_PROJECT_ID**: Click **Settings** → Copy **Project ID**
   - **APPWRITE_DATABASE_ID**: Click **Databases** → Copy your database ID
   - **APPWRITE_DB_READ_ONLY_API_KEY**: Click **Overview** → **API Keys** → Create or copy existing read-only key

### Step 2: Add to GitHub

1. **Go to your GitHub repository**
2. Click **Settings** tab
3. Click **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Add each secret:

#### Add APPWRITE_API
- **Name**: `APPWRITE_API`
- **Secret**: Your Appwrite endpoint (e.g., `https://cloud.appwrite.io/v1`)
- Click **Add secret**

#### Add APPWRITE_PROJECT_ID
- **Name**: `APPWRITE_PROJECT_ID`
- **Secret**: Your project ID
- Click **Add secret**

#### Add APPWRITE_DB_READ_ONLY_API_KEY
- **Name**: `APPWRITE_DB_READ_ONLY_API_KEY`
- **Secret**: Your read-only API key
- Click **Add secret**

#### Add APPWRITE_DATABASE_ID
- **Name**: `APPWRITE_DATABASE_ID`
- **Secret**: Your database ID (e.g., `devpad_main`)
- Click **Add secret**

### Step 3: Verify Secrets

After adding, you should see all these secrets listed:
- ✅ APPWRITE_API
- ✅ APPWRITE_DATABASE_ID
- ✅ APPWRITE_DB_READ_ONLY_API_KEY
- ✅ APPWRITE_PROJECT_ID
- ✅ GOOGLE_API_KEY
- ✅ GOOGLE_APPID
- ✅ GOOGLE_CLIENT_ID
- ✅ MICROSOFT_CLIENT_ID
- ✅ MICROSOFT_REDIRECT_URI
- ✅ SUPABASE_ANON_KEY
- ✅ SUPABASE_URL
- ✅ VERCEL_ORG_ID
- ✅ VERCEL_PROJECT_ID
- ✅ VERCEL_TOKEN

## 🚀 Deploy

After adding the secrets:

```bash
# Commit the updated workflow file
git add .github/workflows/ci-cd.yml
git commit -m "Add Appwrite environment variables to CI/CD"
git push origin master
```

This will trigger a new deployment with the Appwrite variables properly configured.

## 🔍 Verify Deployment

After the deployment completes:
1. Go to your production site
2. Open DevTools Console (F12)
3. Check for Appwrite errors - they should be gone!
4. Changelogs and social links should load properly

## 📝 Quick Reference: Where to Find Values

| Secret | Where to Find |
|--------|---------------|
| `APPWRITE_API` | Appwrite Console → Settings → API Endpoint |
| `APPWRITE_PROJECT_ID` | Appwrite Console → Settings → Project ID |
| `APPWRITE_DATABASE_ID` | Appwrite Console → Databases → Database ID |
| `APPWRITE_DB_READ_ONLY_API_KEY` | Appwrite Console → Overview → API Keys |

## 🛠️ Creating a Read-Only API Key (if needed)

1. Go to Appwrite Console → Your Project
2. Click **Overview** → **API Keys**
3. Click **Create API Key**
4. **Name**: `DevPad Read-Only`
5. **Scopes**: 
   - ✅ `databases.read`
   - ✅ `collections.read`
   - ✅ `documents.read`
   - ❌ Uncheck all write/delete permissions
6. Click **Create**
7. Copy the API key (you won't see it again!)
8. Use this as `APPWRITE_DB_READ_ONLY_API_KEY`

## ⚠️ Security Note

- Never commit these values to your repository
- Only store them in GitHub Secrets
- The workflow will inject them during build time
- They will be compiled into the production bundle
