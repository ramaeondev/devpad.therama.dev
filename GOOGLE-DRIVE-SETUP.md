# Google Drive OAuth Setup Guide

This guide walks you through setting up Google Drive OAuth integration for DevPad.

## Prerequisites

- Google Cloud Platform account
- Access to Google Cloud Console
- DevPad application running

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" dropdown at the top
3. Click "New Project"
4. Enter project name: "DevPad" or your preferred name
5. Click "Create"

## Step 2: Enable Google Drive API

1. In Google Cloud Console, navigate to "APIs & Services" > "Library"
2. Search for "Google Drive API"
3. Click on "Google Drive API"
4. Click "Enable"

## Step 3: Configure OAuth Consent Screen

1. Navigate to "APIs & Services" > "OAuth consent screen"
2. Select "External" user type (or "Internal" if using Google Workspace)
3. Click "Create"
4. Fill in the required fields:
   - **App name**: DevPad
   - **User support email**: Your email
   - **App logo**: (Optional) Upload DevPad logo
   - **Application home page**: Your app URL (e.g., https://devpad.therama.dev)
   - **Authorized domains**: Add your domain (e.g., therama.dev)
   - **Developer contact information**: Your email
5. Click "Save and Continue"
6. **Scopes**: Click "Add or Remove Scopes"
   - Add the following scopes:
     - `https://www.googleapis.com/auth/drive.file` (See, edit, create, and delete files created with this app)
     - `https://www.googleapis.com/auth/drive.metadata.readonly` (View metadata for files in your Google Drive)
   - Click "Update"
   - Click "Save and Continue"
7. **Test users** (if using External):
   - Add your email and any other test users
   - Click "Save and Continue"
8. Review and click "Back to Dashboard"

## Step 4: Create OAuth Client ID

1. Navigate to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Select "Web application"
4. Configure:
   - **Name**: DevPad Web Client
   - **Authorized JavaScript origins**:
     - http://localhost:4200 (for development)
     - https://devpad.therama.dev (production URL)
     - Add any other domains where your app runs
   - **Authorized redirect URIs**: Leave empty (we use implicit flow with Google Identity Services)
5. Click "Create"
6. **Important**: Copy the Client ID (it looks like: `123456789-abcdefg.apps.googleusercontent.com`)
7. Click "OK"

## Step 5: Configure DevPad

### Development Environment

1. Open `src/environments/environment.ts`
2. Replace the placeholder with your actual Client ID:

```typescript
export const environment = {
  production: false,
  supabase: {
    url: 'YOUR_SUPABASE_URL',
    anonKey: 'YOUR_SUPABASE_ANON_KEY'
  },
  google: {
    clientId: 'YOUR_ACTUAL_CLIENT_ID.apps.googleusercontent.com' // Replace this
  }
};
```

### Production Environment

1. Open `src/environments/environment.prod.ts`
2. Replace the placeholder with your actual Client ID:

```typescript
export const environment = {
  production: true,
  supabase: {
    url: 'YOUR_SUPABASE_URL',
    anonKey: 'YOUR_SUPABASE_ANON_KEY'
  },
  google: {
    clientId: 'YOUR_ACTUAL_CLIENT_ID.apps.googleusercontent.com' // Replace this
  }
};
```

## Step 6: Set Up Supabase Database

Run the migration SQL to create the integrations table:

1. Open Supabase Dashboard
2. Navigate to "SQL Editor"
3. Create a new query
4. Copy the contents of `supabase-integrations.sql`
5. Run the query

The migration creates:
- `integrations` table for storing OAuth tokens
- Row Level Security (RLS) policies
- Indexes for performance
- Auto-update trigger for `updated_at`

## Step 7: Test the Integration

1. Start your development server: `npm start`
2. Open the app in your browser
3. Navigate to Settings (click your avatar → Settings)
4. Scroll to "Cloud Storage" section
5. Click "Connect" on Google Drive
6. You should see the Google OAuth consent screen
7. Grant permissions
8. You should be redirected back and see "Connected" status

## Security Notes

### OAuth Token Storage

- Access tokens are stored in Supabase `integrations` table
- Tokens are protected by Row Level Security (RLS)
- Each user can only access their own tokens
- Tokens are encrypted in transit via HTTPS
- Consider encrypting tokens at rest for additional security

### Scopes

We use minimal scopes required:
- `drive.file`: Only access files created by the app (not all Drive files)
- `drive.metadata.readonly`: View file metadata (for folder tree)

### Best Practices

1. **Never commit Client IDs to version control**
   - Use environment variables in production
   - Keep `environment.prod.ts` in `.gitignore` or use build-time replacement

2. **Rotate credentials if compromised**
   - Generate new OAuth client in Google Cloud Console
   - Update environment files
   - Redeploy

3. **Monitor API usage**
   - Check Google Cloud Console for quota usage
   - Set up alerts for unusual activity

4. **Token expiration**
   - Access tokens expire (typically 1 hour)
   - Implement token refresh logic if needed
   - Store refresh_token for long-term access

## Troubleshooting

### "OAuth client not found" error
- Verify the Client ID is correct in environment files
- Check that the domain is authorized in Google Cloud Console

### "Access blocked: Authorization Error"
- Complete the OAuth consent screen configuration
- Add your email as a test user (if using External)
- Request verification from Google (for production with External)

### "Invalid redirect_uri" error
- Ensure your app's origin is in "Authorized JavaScript origins"
- Check for typos in the URLs
- Make sure protocol (http/https) matches

### Token not saving
- Check browser console for errors
- Verify Supabase connection
- Ensure `integrations` table exists and RLS policies are correct
- Check that user is authenticated

### "Failed to load Google Identity Services"
- Check internet connection
- Verify no ad blockers are blocking Google scripts
- Check browser console for CSP errors

## Additional Resources

- [Google Identity Services Documentation](https://developers.google.com/identity/gsi/web/guides/overview)
- [Google Drive API Documentation](https://developers.google.com/drive/api/guides/about-sdk)
- [OAuth 2.0 for Client-side Web Applications](https://developers.google.com/identity/protocols/oauth2/javascript-implicit-flow)

## Support

If you encounter issues:
1. Check browser console for errors
2. Review Supabase logs
3. Verify Google Cloud Console configuration
4. Open an issue on GitHub with detailed error messages
