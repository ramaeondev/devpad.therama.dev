# OneDrive "itemNotFound" Error Fix

## Problem

When connecting to OneDrive, the application was receiving an "itemNotFound" error when trying to access `/me/drive/root/children`:

```json
{
  "error": {
    "code": "itemNotFound",
    "message": "Item does not exist",
    "localizedMessage": "That item seems to be missing..."
  }
}
```

## Root Causes

This error can occur due to several reasons:

1. **Drive Not Provisioned**: The user's OneDrive may not be fully set up
2. **Account Type Differences**: Personal vs Business accounts have different drive structures
3. **Permission Issues**: The root folder may not be accessible with current permissions
4. **Empty Drive**: The drive exists but has no root folder structure yet
5. **Regional/Tenant Issues**: Some Microsoft 365 tenants have different configurations

## Solution Implemented

### 1. Multi-Step Drive Detection

The updated `loadFiles()` method now follows a robust fallback strategy:

```typescript
// Step 1: Check if /me/drive exists
try {
  const driveInfo = await this.http.get(`/me/drive`);
} catch {
  // Step 2: If that fails, list all available drives
  const drives = await this.http.get(`/me/drives`);
  // Use the first available drive
}
```

### 2. Multiple Endpoint Fallbacks

If the standard `/root/children` endpoint fails, the service now tries:

1. **Standard Root**: `/me/drive/root/children`
2. **Special Folder**: `/me/drive/special/documents/children` (Documents folder)
3. **Items Root**: `/me/drive/items/root/children` (alternative root access)
4. **Empty State**: If all fail, show empty folder structure

### 3. Better Error Handling

The service now provides specific error messages:

- **InvalidAuthenticationToken**: "OneDrive session expired. Please reconnect."
- **itemNotFound**: "OneDrive folder not found. The drive may be empty."
- **No Drive Found**: "No OneDrive found for this account"
- **Generic Error**: "Failed to load OneDrive files"

### 4. Graceful Degradation

If all attempts fail, the service:

- Sets an empty root folder structure
- Doesn't crash the application
- Provides clear feedback to the user
- Logs detailed error information for debugging

## Code Changes

### File: `src/app/core/services/onedrive.service.ts`

**Method**: `loadFiles()`

**Key Improvements**:

1. Added drive existence check
2. Implemented fallback to `/me/drives` endpoint
3. Added multiple endpoint attempts for root children
4. Improved error messages with specific codes
5. Added empty state handling
6. Enhanced console logging for debugging

## Testing Recommendations

### 1. Test Different Account Types

**Personal Microsoft Account**:

- Sign in with @outlook.com, @hotmail.com, or @live.com
- Verify files load correctly
- Check that folder structure appears

**Business/School Account**:

- Sign in with organizational account
- Test with Microsoft 365 Business
- Verify SharePoint integration works

### 2. Test Edge Cases

**Empty Drive**:

- Test with a brand new OneDrive account
- Verify empty state displays correctly
- Check that no errors are thrown

**Restricted Access**:

- Test with limited permissions
- Verify fallback to Documents folder works
- Check error messages are user-friendly

**Expired Token**:

- Wait for token to expire
- Verify reconnection prompt appears
- Check that state is cleared properly

### 3. Test Error Recovery

**Network Issues**:

- Disconnect network during load
- Verify error handling
- Check retry mechanism

**Invalid Token**:

- Manually invalidate token in database
- Verify error detection
- Check reconnection flow

## Debugging Guide

### Check Console Logs

The service now logs detailed information:

```javascript
// Success logs
'OneDrive info: {...}';
'Using drive: {...}';

// Error logs
'Drive check error: {...}';
'Root children error: {...}';
'Special folder error: {...}';
```

### Common Issues and Solutions

#### Issue: "No OneDrive found for this account"

**Solution**:

- User may not have OneDrive enabled
- Check Microsoft 365 license
- Verify OneDrive is provisioned in admin center

#### Issue: "Showing Documents folder (root not accessible)"

**Solution**:

- This is expected for some account types
- Documents folder is being used as fallback
- Files will still be accessible

#### Issue: "Unable to access OneDrive files"

**Solution**:

- Check OAuth scopes are correct
- Verify access token is valid
- Check Microsoft Graph API permissions

## OAuth Scopes Required

Current scopes (already configured):

```typescript
private readonly SCOPES = 'Files.ReadWrite.All offline_access User.Read';
```

**Breakdown**:

- `Files.ReadWrite.All`: Full access to user's files
- `offline_access`: Allows refresh tokens (for implicit flow)
- `User.Read`: Read user profile information

**Note**: These scopes should be sufficient for all operations.

## API Endpoints Used

### Primary Endpoints

1. `/me/drive` - Get user's default drive
2. `/me/drives` - List all available drives
3. `/me/drive/root/children` - Get root folder contents

### Fallback Endpoints

1. `/me/drive/special/documents/children` - Documents folder
2. `/me/drive/items/root/children` - Alternative root access

### Other Operations

- `/me/drive/items/{id}/children` - Get folder contents
- `/me/drive/items/{id}/content` - Download file
- `/me/drive/items/{id}` - Update/delete item
- `/me` - Get user information

## Microsoft Graph API Documentation

For reference:

- [OneDrive API Overview](https://learn.microsoft.com/en-us/graph/onedrive-concept-overview)
- [List Drive Items](https://learn.microsoft.com/en-us/graph/api/driveitem-list-children)
- [Get Drive](https://learn.microsoft.com/en-us/graph/api/drive-get)
- [Special Folders](https://learn.microsoft.com/en-us/graph/api/drive-get-specialfolder)

## Known Limitations

1. **Implicit Flow**: Currently using OAuth implicit flow which has limitations:
   - Tokens expire after 1 hour
   - No refresh token available
   - Requires re-authentication

2. **Recursive Loading**: Deep folder structures may take time to load
   - Consider implementing lazy loading
   - Add pagination for large folders

3. **Rate Limiting**: Microsoft Graph has rate limits:
   - Be cautious with recursive folder loading
   - Implement exponential backoff if needed

## Future Enhancements

1. **Authorization Code Flow**: Switch to auth code flow for better token management
2. **Incremental Loading**: Load folders on-demand instead of recursively
3. **Caching**: Cache folder structure to reduce API calls
4. **Pagination**: Implement proper pagination for large folders
5. **Search**: Add file search functionality
6. **Thumbnails**: Show file thumbnails for images
7. **Sharing**: Implement file sharing capabilities

## Monitoring

### Success Metrics

- Connection success rate
- File load success rate
- Average load time
- Error rate by type

### Error Tracking

Monitor these error codes:

- `itemNotFound`
- `InvalidAuthenticationToken`
- `accessDenied`
- `generalException`

## Support

If users continue experiencing issues:

1. **Check Account Status**:
   - Verify OneDrive is enabled
   - Check Microsoft 365 license
   - Confirm account is not locked

2. **Check Permissions**:
   - Verify OAuth consent was granted
   - Check app registration in Azure AD
   - Confirm API permissions are admin-approved

3. **Check Network**:
   - Verify no firewall blocking Microsoft Graph
   - Check proxy settings
   - Confirm DNS resolution works

4. **Contact Microsoft Support**:
   - For tenant-specific issues
   - For licensing problems
   - For API access issues

## Conclusion

The updated OneDrive service now handles the "itemNotFound" error gracefully by:

- ✅ Checking drive existence before accessing files
- ✅ Trying multiple endpoints as fallbacks
- ✅ Providing specific error messages
- ✅ Handling empty drives gracefully
- ✅ Supporting different account types
- ✅ Logging detailed debug information

Users should now have a much more reliable OneDrive integration experience!
