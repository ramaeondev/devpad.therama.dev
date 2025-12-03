# OneDrive Session Management & Account Switching Fix

## Problem

When disconnecting OneDrive, the application only removed the token from the database but didn't revoke the Microsoft session in the browser. This caused two issues:

1. **No Account Switching**: When reconnecting, users were automatically logged in with the same account without seeing the login screen
2. **Cached Session**: The browser's Microsoft session remained active, preventing users from choosing a different account

## Solution Implemented

### 1. Session Revocation on Disconnect

Updated the `disconnect()` method to perform a complete cleanup:

**Before**:
```typescript
async disconnect() {
  // Only deleted token from database
  await this.supabase.from('integrations').delete().eq('id', integration.id);
  this.integration.set(null);
  this.isConnected.set(false);
}
```

**After**:
```typescript
async disconnect() {
  // Step 1: Revoke Microsoft session (NEW!)
  await this.revokeMicrosoftSession();
  
  // Step 2: Delete integration from database
  await this.supabase.from('integrations').delete().eq('id', integration.id);
  
  // Step 3: Clear local state
  this.integration.set(null);
  this.isConnected.set(false);
  this.files.set([]);
  this.rootFolder.set(null);
}
```

### 2. Microsoft Session Revocation

Added new `revokeMicrosoftSession()` method that:

1. **Creates Hidden Iframe**: Opens Microsoft logout URL in a hidden iframe
2. **Logout Endpoint**: Uses `https://login.microsoftonline.com/common/oauth2/v2.0/logout`
3. **Redirect After Logout**: Returns to the application origin
4. **Silent Process**: Happens in the background without user interaction
5. **Cleanup**: Removes iframe after logout completes

**Implementation**:
```typescript
private async revokeMicrosoftSession(): Promise<void> {
  const logoutUrl = `${this.AUTHORITY}/oauth2/v2.0/logout?post_logout_redirect_uri=${encodeURIComponent(window.location.origin)}`;
  
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.src = logoutUrl;
  
  // Wait for logout to complete
  iframe.onload = () => {
    setTimeout(() => {
      document.body.removeChild(iframe);
      resolve();
    }, 1000);
  };
  
  document.body.appendChild(iframe);
}
```

### 3. Force Account Selection on Connect

Updated the `connect()` method to always show the account picker:

**Added `prompt=select_account` parameter**:
```typescript
async connect(forceAccountSelection: boolean = true) {
  const authUrl = this.buildAuthUrl(forceAccountSelection);
  // Opens popup with account selection screen
}

private buildAuthUrl(forceAccountSelection: boolean = true) {
  const params = new URLSearchParams({
    client_id: environment.microsoft.clientId,
    response_type: 'token',
    redirect_uri: environment.microsoft.redirectUri + '/auth/callback/onedrive',
    scope: this.SCOPES,
    response_mode: 'fragment',
  });
  
  // Force account selection
  if (forceAccountSelection) {
    params.append('prompt', 'select_account');
  }
  
  return `${this.AUTHORITY}/oauth2/v2.0/authorize?${params.toString()}`;
}
```

## How It Works

### Disconnect Flow

```
User clicks "Disconnect OneDrive"
         ↓
1. Clear token refresh timer
         ↓
2. Revoke Microsoft session
   - Create hidden iframe
   - Load Microsoft logout URL
   - Wait for logout completion
   - Remove iframe
         ↓
3. Delete integration from database
         ↓
4. Clear local state
   - integration = null
   - isConnected = false
   - files = []
   - rootFolder = null
         ↓
5. Show success message
   "OneDrive disconnected successfully. You can now connect with a different account."
```

### Reconnect Flow

```
User clicks "Connect OneDrive"
         ↓
Build auth URL with prompt=select_account
         ↓
Open popup window
         ↓
Microsoft shows account picker
   - List of available accounts
   - Option to use different account
   - Option to add new account
         ↓
User selects account
         ↓
Microsoft authenticates
         ↓
Returns access token
         ↓
Save to database and load files
```

## Microsoft OAuth Prompt Parameter

The `prompt` parameter controls the authentication experience:

| Value | Behavior |
|-------|----------|
| `none` | No interaction, silent auth (fails if not logged in) |
| `login` | Always show login screen |
| `select_account` | Show account picker (our choice) |
| `consent` | Show consent screen again |

We use `select_account` because it:
- ✅ Shows all available accounts
- ✅ Allows switching between accounts
- ✅ Allows adding new accounts
- ✅ Doesn't force re-login if user wants same account
- ✅ Provides best user experience

## Benefits

### 1. Account Switching
Users can now:
- Disconnect from one OneDrive account
- Connect to a different OneDrive account
- Switch between personal and business accounts
- Use multiple accounts (one at a time)

### 2. Clean Session Management
- No stale sessions in browser
- No cached credentials
- Fresh authentication each time
- Better security

### 3. Better User Experience
- Clear feedback on disconnect
- Account picker always shown
- No confusion about which account is connected
- Easy to switch accounts

### 4. Improved Security
- Sessions are properly revoked
- No lingering access tokens
- Clean logout process
- Follows OAuth best practices

## Testing

### Test Case 1: Basic Disconnect
1. Connect OneDrive with Account A
2. Verify files load
3. Click "Disconnect OneDrive"
4. Verify success message mentions account switching
5. Check that integration is removed from database
6. Verify UI shows "not connected" state

### Test Case 2: Account Switching
1. Connect OneDrive with Account A (e.g., personal@outlook.com)
2. Verify files load correctly
3. Click "Disconnect OneDrive"
4. Wait for disconnect to complete
5. Click "Connect OneDrive" again
6. **Verify**: Account picker appears
7. Select Account B (e.g., work@company.com)
8. Verify files from Account B load

### Test Case 3: Same Account Reconnection
1. Connect OneDrive with Account A
2. Disconnect
3. Reconnect
4. **Verify**: Account picker shows Account A
5. Select Account A again
6. Verify reconnection works smoothly

### Test Case 4: Session Revocation
1. Connect OneDrive
2. Open browser DevTools → Network tab
3. Click "Disconnect OneDrive"
4. **Verify**: Request to Microsoft logout endpoint
5. Check console for "Microsoft session revoked successfully"
6. Verify no errors in console

### Test Case 5: Multiple Accounts
1. Have 2+ Microsoft accounts logged in to browser
2. Connect OneDrive with Account A
3. Disconnect
4. Reconnect
5. **Verify**: Both accounts appear in picker
6. Select Account B
7. Verify Account B connects successfully

## Troubleshooting

### Issue: Account picker doesn't show

**Possible Causes**:
- Browser is blocking the popup
- `prompt` parameter not being added
- Microsoft session still cached

**Solutions**:
1. Check browser console for popup blocker warnings
2. Verify `forceAccountSelection` is true
3. Clear browser cookies for `login.microsoftonline.com`
4. Try in incognito/private mode

### Issue: Logout iframe fails

**Possible Causes**:
- Network issues
- CORS restrictions
- Ad blockers

**Solutions**:
1. Check browser console for errors
2. Verify network connectivity
3. Disable ad blockers temporarily
4. The disconnect will still work (graceful degradation)

### Issue: Same account auto-selects

**Possible Causes**:
- Browser remembering last account
- Microsoft "stay signed in" option
- Cached credentials

**Solutions**:
1. User can still select different account from picker
2. Clear browser cookies
3. Use different browser/incognito mode
4. This is expected Microsoft behavior

## Microsoft Logout Endpoint

### Endpoint
```
https://login.microsoftonline.com/common/oauth2/v2.0/logout
```

### Parameters
- `post_logout_redirect_uri`: Where to redirect after logout (our app origin)

### Behavior
- Clears Microsoft session cookies
- Revokes active sessions
- Redirects to specified URI
- Works across all Microsoft services

### Documentation
[Microsoft Identity Platform Logout](https://learn.microsoft.com/en-us/azure/active-directory/develop/v2-protocols-oidc#send-a-sign-out-request)

## Code Changes Summary

### Modified Methods

1. **`disconnect()`**
   - Added session revocation step
   - Better error handling
   - Updated success message

2. **`connect()`**
   - Added `forceAccountSelection` parameter
   - Defaults to `true` for better UX

3. **`buildAuthUrl()`**
   - Added `forceAccountSelection` parameter
   - Conditionally adds `prompt=select_account`

### New Methods

1. **`revokeMicrosoftSession()`**
   - Creates hidden iframe
   - Loads Microsoft logout URL
   - Handles cleanup
   - Returns promise for async flow

## Best Practices Followed

1. **Graceful Degradation**: If session revocation fails, disconnect still works
2. **User Feedback**: Clear messages about what's happening
3. **Security**: Proper session cleanup
4. **UX**: Account picker always shown for clarity
5. **Error Handling**: Try-catch blocks with fallbacks
6. **Async/Await**: Clean promise handling
7. **Cleanup**: Proper resource cleanup (iframe removal)
8. **Logging**: Console logs for debugging

## Future Enhancements

1. **Visual Feedback**: Show loading spinner during logout
2. **Confirmation Dialog**: Ask user to confirm disconnect
3. **Account Display**: Show connected account email in UI
4. **Quick Switch**: Add "Switch Account" button without full disconnect
5. **Session Monitoring**: Detect when Microsoft session expires
6. **Multi-Account**: Support multiple OneDrive accounts simultaneously

## Related Documentation

- [Microsoft Identity Platform](https://learn.microsoft.com/en-us/azure/active-directory/develop/)
- [OAuth 2.0 Implicit Flow](https://learn.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-implicit-grant-flow)
- [Microsoft Graph API](https://learn.microsoft.com/en-us/graph/overview)
- [OneDrive API](https://learn.microsoft.com/en-us/graph/onedrive-concept-overview)

## Conclusion

The OneDrive disconnect functionality now properly:
- ✅ Revokes Microsoft browser session
- ✅ Clears all local state
- ✅ Allows account switching
- ✅ Shows account picker on reconnect
- ✅ Provides clear user feedback
- ✅ Handles errors gracefully
- ✅ Follows OAuth best practices

Users can now easily switch between different OneDrive accounts! 🎉
