# Adding New Environment Variables

This guide explains how to add a new environment variable to the DevPad project.

## Quick Steps

## Required Variables for Production

The application requires these environment variables for production builds and deployment. The `inject-env` script will fail the build if these are not present:

- `SUPABASE_URL` - The URL for your Supabase instance (e.g., https://your-supabase.supabase.co)
- `SUPABASE_ANON_KEY` - Public anon key for client usage

Other variables used by the app (Google/Microsoft/Appwrite integrations) are optional but recommended for full functionality.

When you need to add a new environment variable, follow these steps in order:

### 1. Add to `.env` file

Add your new variable to the `.env` file in the project root:

```env
NEW_VARIABLE_NAME=your_value_here
```

### 2. Update `scripts/inject-env.js`

Add the variable to the `envVariables` object:

```javascript
const envVariables = {
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
  // ... other existing variables
  NEW_VARIABLE_NAME: process.env.NEW_VARIABLE_NAME || '', // ← Add this
};
```

### 3. Update config structure in `inject-env.js`

Add the variable to the config object in the `generateConfigFile` function. Decide where it belongs (new section or existing section):

**Option A: Add to existing section**

```javascript
const content = `export const config = {
  supabase: {
    url: '${envVariables.SUPABASE_URL}',
    anonKey: '${envVariables.SUPABASE_ANON_KEY}',
    newKey: '${envVariables.NEW_VARIABLE_NAME}',  // ← Add here
  },
  // ... rest of config
};
`;
```

**Option B: Create new section**

```javascript
const content = `export const config = {
  // ... existing config
  newSection: {
    newKey: '${envVariables.NEW_VARIABLE_NAME}',  // ← Add new section
  },
};
`;
```

### 4. Update `src/config.ts`

Add the placeholder to the base config file in the same location:

```typescript
export const config = {
  supabase: {
    url: 'SUPABASE_URL_PLACEHOLDER',
    anonKey: 'SUPABASE_ANON_KEY_PLACEHOLDER',
    newKey: 'NEW_VARIABLE_NAME_PLACEHOLDER', // ← Add placeholder
  },
  // ... rest of config
};
```

### 5. Regenerate config files

Run the inject script to generate updated config files:

```bash
npm run inject-env
```

This will update `src/config.dev.ts` and `src/config.prod.ts` with the actual values from your `.env` file.

### 6. Use in your code

Import and use the new config value in your services or components:

```typescript
import { config } from '../../../config';

// Use it
const value = config.supabase.newKey;
// or
const value = config.newSection.newKey;
```

### 7. Update deployment platform

**Important:** Add the new environment variable to your deployment platform (Vercel, etc.) for production builds. The variable must be set in the platform's environment settings.

---

## Example: Adding a New API Key

Let's say you want to add a `STRIPE_API_KEY`:

### Step 1: `.env`

```env
STRIPE_API_KEY=sk_test_1234567890
```

### Step 2: `scripts/inject-env.js`

```javascript
const envVariables = {
  // ... existing
  STRIPE_API_KEY: process.env.STRIPE_API_KEY || '',
};
```

### Step 3: `scripts/inject-env.js` (in generateConfigFile)

```javascript
const content = `export const config = {
  // ... existing
  stripe: {
    apiKey: '${envVariables.STRIPE_API_KEY}',
  },
};
`;
```

### Step 4: `src/config.ts`

```typescript
export const config = {
  // ... existing
  stripe: {
    apiKey: 'STRIPE_API_KEY_PLACEHOLDER',
  },
};
```

### Step 5: Run inject

```bash
npm run inject-env
```

### Step 6: Use it

```typescript
import { config } from '../../../config';
const stripeKey = config.stripe.apiKey;
```

### Step 7: Add to Vercel

Go to Vercel Dashboard → Project Settings → Environment Variables → Add `STRIPE_API_KEY`

---

## Important Notes

1. **Always run `npm run inject-env`** after adding a new variable to update the generated config files
2. **The pre-hooks** (`prestart`, `prebuild`) will automatically run `inject-env`, but it's good practice to run it manually after making changes
3. **Don't commit** `.env`, `config.dev.ts`, or `config.prod.ts` - they're in `.gitignore`
4. **Do commit** changes to `config.ts` and `inject-env.js` - these are the templates
5. **Update documentation** if the new variable is user-facing or requires setup instructions

---

## Troubleshooting

**Problem:** New variable shows as placeholder in the app

**Solution:**

- Make sure you ran `npm run inject-env`
- Check that the variable name matches exactly in all files
- Verify the variable is in your `.env` file
- Restart your dev server

**Problem:** Variable is undefined

**Solution:**

- Check the variable name spelling (case-sensitive)
- Verify it's added to the deployment platform's environment variables
- Make sure you're importing from the correct config file

---

## Checklist

When adding a new environment variable:

- [ ] Added to `.env` file
- [ ] Added to `envVariables` in `inject-env.js`
- [ ] Added to config structure in `generateConfigFile` function
- [ ] Added placeholder to `src/config.ts`
- [ ] Ran `npm run inject-env`
- [ ] Updated code to use the new config value
- [ ] Added to deployment platform (Vercel, etc.)
- [ ] Tested locally
- [ ] Tested in production build
