# OneDrive OAuth Setup Guide

This guide walks you through setting up OneDrive OAuth integration for DevPad.

## Prerequisites

- Microsoft Azure account
- Access to Azure Portal
- DevPad application running

## Step 1: Create Azure AD Application

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to "Azure Active Directory" (or "Microsoft Entra ID")
3. Click "App registrations" in the left sidebar
4. Click "New registration"
5. Fill in the details:
   - **Name**: DevPad
   - **Supported account types**: Accounts in any organizational directory and personal Microsoft accounts
   - **Redirect URI**: Select "Single-page application (SPA)" and enter:
     - Development: `http://localhost:4200/auth/callback/onedrive`
     - Production: `https://devpad.therama.dev/auth/callback/onedrive`
6. Click "Register"

## Step 2: Configure API Permissions

1. In your app registration, click "API permissions" in the left sidebar
2. Click "Add a permission"
3. Select "Microsoft Graph"
4. Select "Delegated permissions"
5. Add the following permissions:
   - `Files.ReadWrite.All` - Read and write all user files
   - `offline_access` - Maintain access to data you have given it access to
   - `User.Read` - Sign in and read user profile
6. Click "Add permissions"
7. (Optional) Click "Grant admin consent" if you have admin rights

## Step 3: Configure Authentication

1. Click "Authentication" in the left sidebar
2. Under "Platform configurations", click "Add a platform" if not already added, select "Single-page application"
3. Add **BOTH** redirect URIs (must match exactly - no trailing slashes):
   - Production: `https://devpad.therama.dev/auth/callback/onedrive`
   - Development: `http://localhost:4200/auth/callback/onedrive`
   
   **Important**: The URIs must match EXACTLY what your app sends. Azure is case-sensitive and checks for exact matches including the path.

4. Under "Front-channel logout URL", add (this is for Azure AD to notify your app during sign-out):
   - Production: `https://devpad.therama.dev/auth/logout`
   - Development: `http://localhost:4200/auth/logout`
   
5. Under "Implicit grant and hybrid flows":
   - ✅ Check "Access tokens (used for implicit flows)"
   - ✅ Check "ID tokens (used for implicit and hybrid flows)"
   
6. Under "Allow public client flows": Select "No"
7. Click "Save" at the bottom

**⚠️ Common Mistakes:**
- Adding trailing slash: `https://devpad.therama.dev/auth/callback/onedrive/` ❌
- Wrong protocol: `http://devpad.therama.dev/auth/callback/onedrive` ❌  
- Wrong path: `https://devpad.therama.dev/callback/onedrive` ❌
- Correct format: `https://devpad.therama.dev/auth/callback/onedrive` ✅

## Step 4: Verify Publisher (Recommended)

**Note**: Becoming a verified publisher increases customer trust and removes the "unverified" warning during OAuth consent.

### Option 1: Domain Ownership Verification (Recommended for Web Apps)

1. In your app registration, go to "Branding & properties"
2. Click "Add a verified domain" or "Configure publisher verification"
3. Enter your domain: `devpad.therama.dev`
4. Azure will provide a JSON file to host at: `https://devpad.therama.dev/.well-known/microsoft-identity-association.json`
5. The file is already created in your project at: `public/.well-known/microsoft-identity-association.json`
6. Deploy your app (the file will be publicly accessible)
7. Return to Azure Portal and click "Verify and save domain"
8. Azure will check the file and verify your domain ownership

**Service Management Reference**: This field references application context information from a Service or Asset Management database (if applicable to your organization).

### Option 2: Microsoft Partner Network (MPN) Verification

1. Create or link a Microsoft Partner Network (MPN) account
2. Follow the verification wizard in Azure Portal
3. This option is typically for larger organizations or ISVs

For more details: [Publisher Verification Documentation](https://docs.microsoft.com/en-us/azure/active-directory/develop/publisher-verification-overview)

**If you skip verification**: Users will see "Unverified" during consent, which is acceptable for personal/development apps.

## Step 5: Get Application (Client) ID

1. In your app registration, go to "Overview"
2. Copy the "Application (client) ID" (looks like: `12345678-1234-1234-1234-123456789abc`)
3. Keep this ID safe - you'll need it for configuration

## Step 6: Configure DevPad

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
    clientId: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com'
  },
  microsoft: {
    clientId: 'YOUR_ACTUAL_CLIENT_ID', // Replace this
    redirectUri: 'http://localhost:4200'
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
    clientId: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com'
  },
  microsoft: {
    clientId: 'YOUR_ACTUAL_CLIENT_ID', // Replace this
    redirectUri: 'https://devpad.therama.dev'
  }
};
```

## Step 7: Verify Supabase Database

The `integrations` table should already exist from the Google Drive setup. If not, run `supabase-integrations.sql` in Supabase SQL Editor.

The table already supports OneDrive with:
- `provider` field includes 'onedrive' option
- Same token storage structure
- Row Level Security policies

## Step 8: Test the Integration

1. Start your development server: `npm start`
2. Open the app in your browser
3. Navigate to Settings (click your avatar → Settings)
4. Scroll to "Cloud Storage" section
5. Click "Connect" on OneDrive
6. A popup will open for Microsoft OAuth
7. Sign in with your Microsoft account
8. Grant permissions
9. The popup will close and you should see "Connected" status

## OAuth Flow Details

### How It Works

1. User clicks "Connect" button
2. App opens popup window with Microsoft OAuth URL
3. User authenticates with Microsoft
4. Microsoft redirects to `/auth/callback/onedrive` with access token in URL fragment
5. Callback page extracts token and posts message to parent window
6. Service receives token and saves to Supabase
7. Popup closes automatically
8. App loads OneDrive files

### Token Flow (Implicit Grant)

```
User → DevPad → Azure AD → User Login → Azure AD → Redirect with Token → Callback Page → PostMessage → DevPad
```

## Security Notes

### OAuth Token Storage

- Access tokens are stored in Supabase `integrations` table
- Tokens are protected by Row Level Security (RLS)
- Each user can only access their own tokens
- Tokens are encrypted in transit via HTTPS
- Consider encrypting tokens at rest for additional security

### Permissions

We use minimal permissions required:
- `Files.ReadWrite.All`: Access to user's OneDrive files
- `offline_access`: Refresh token for long-term access
- `User.Read`: Get user's email for identification

### Best Practices

1. **Never commit Client IDs to version control**
   - Use environment variables in production
   - Keep `environment.prod.ts` in `.gitignore` or use build-time replacement

2. **Rotate credentials if compromised**
   - Generate new client secret in Azure Portal (if using confidential client)
   - Update environment files
   - Redeploy

3. **Monitor API usage**
   - Check Azure Portal for API call statistics
   - Set up alerts for unusual activity

4. **Token expiration**
   - Access tokens expire (typically 1 hour)
   - Implement token refresh logic using refresh_token
   - Store refresh_token securely in Supabase

## Troubleshooting

### "Invalid client" error
- Verify the Client ID is correct in environment files
- Check that the redirect URI matches exactly in Azure Portal

### "AADSTS50011: The redirect URI specified in the request does not match"
- Ensure redirect URI in environment matches Azure Portal configuration
- Check for trailing slashes (should not have them)
- Verify protocol (http vs https)

### Popup blocked
- Ensure browser allows popups for your domain
- Check browser console for popup blocker messages
- Try clicking "Connect" again

### Token not saving
- Check browser console for errors
- Verify Supabase connection
- Ensure `integrations` table exists and RLS policies are correct
- Check that user is authenticated

### "Failed to load files"
- Verify access token is valid
- Check browser console for API errors
- Ensure Microsoft Graph API permissions are granted
- Try disconnecting and reconnecting

### CORS errors
- Microsoft Graph API should allow CORS from browser
- If issues persist, check browser console for specific error
- Verify API permissions are granted

## Additional Resources

- [Microsoft Identity Platform Documentation](https://docs.microsoft.com/en-us/azure/active-directory/develop/)
- [Microsoft Graph API Documentation](https://docs.microsoft.com/en-us/graph/overview)
- [OAuth 2.0 Implicit Grant Flow](https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-implicit-grant-flow)
- [OneDrive API Reference](https://docs.microsoft.com/en-us/graph/api/resources/onedrive)

## Comparison with Google Drive

| Feature | Google Drive | OneDrive |
|---------|--------------|----------|
| OAuth Provider | Google Identity Services | Microsoft Identity Platform |
| Token Type | Access Token | Access Token + Refresh Token |
| API | Google Drive API v3 | Microsoft Graph API |
| Scopes | drive.file, drive.readonly | Files.ReadWrite.All, offline_access |
| Token Loading | Dynamic script injection | Direct API calls |
| Authentication | Token Client | OAuth 2.0 Implicit Flow |

## API Rate Limits

Microsoft Graph API has the following rate limits:
- **Per-app limit**: 10,000 requests per 10 seconds
- **Per-user limit**: 120 requests per 60 seconds

Best practices:
- Cache file listings when possible
- Implement exponential backoff for retries
- Use batch requests for multiple operations

## Support

If you encounter issues:
1. Check browser console for errors
2. Review Azure Portal logs
3. Verify app registration configuration
4. Check Supabase integration table
5. Open an issue on GitHub with detailed error messages
