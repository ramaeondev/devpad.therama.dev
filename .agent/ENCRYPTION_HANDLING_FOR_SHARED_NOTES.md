# Encryption Handling for Shared Notes

**Date:** December 7, 2025  
**Status:** Implemented with policy documentation

## Problem

When sharing a note, if that note has encryption enabled (`is_encrypted=true`), the shared link viewers would receive encrypted gibberish without any way to decrypt it, because:

1. **Content is encrypted at rest**: `notes.content` contains the encrypted ciphertext
2. **RPC returns encrypted content directly**: `get_shared_note()` returns `notes.content` as-is
3. **Encryption key is owner-only**: Only the owner has the decryption key, stored client-side
4. **Anonymous viewers have no key**: Public share viewers can't decrypt anything
5. **No clear messaging**: Viewers got confused by unreadable content

## Solution: Owner-Only Decryption with Clear Policy

### Architecture

**RPC Changes** (`get_shared_note`):

- Now returns `is_encrypted` and `encryption_version` flags from the notes table
- Viewers can detect if content is encrypted, even if they can't read it
- Content is still returned encrypted (as stored in DB)

**Share Service** (`getShareByTokenInternal`):

- Checks if returned note is encrypted: `if (resolvedNote.is_encrypted)`
- If encrypted AND user has encryption key loaded: **Decrypt before returning**
- If encrypted AND no key available: **Show encrypted message, set `requiresEncryptionKey` flag**
- Only owner or users logged in with the same encryption key can decrypt

**Public Note Component**:

- Tracks encryption status via signals: `isEncrypted`, `requiresEncryptionKey`
- Can display different UI based on encryption state
- Saves work the same way (content sent as-is to RPC)

### User Flows

**Owner viewing their encrypted shared note** (has encryption key loaded):

```
1. Owner clicks their own shared link
2. RPC returns: is_encrypted=true, content=encrypted_ciphertext
3. Share service detects encryption AND key is loaded
4. Decrypts content client-side
5. Owner sees readable content in public-note viewer
```

**Non-owner viewing encrypted shared note** (no encryption key):

```
1. Non-owner clicks shared link
2. RPC returns: is_encrypted=true, content=encrypted_ciphertext
3. Share service detects encryption AND no key available
4. Shows: "[This note is encrypted. Sign in with your encryption key to view it.]"
5. Content is not shown
6. Editing is blocked (UI disabled for encrypted shares without key)
```

**Owner sharing decrypted note**:

```
1. Owner disables encryption on note in dashboard (decrypts content)
2. Shares the note
3. RPC returns: is_encrypted=false, content=plaintext
4. All viewers see plaintext
```

### Code Flow

#### RPC Returns Encryption Metadata

```sql
-- get_shared_note now returns:
SELECT
  ...
  n.content AS note_content,
  n.is_encrypted,
  n.encryption_version,
  ...
FROM public.notes n
```

#### Share Service Handles Decryption

```typescript
const resolvedNote = await rpc('get_shared_note', { p_share_token });

if (resolvedNote.is_encrypted && contentToUse) {
  try {
    if (this.encryption.hasKey()) {
      // Owner has key - decrypt it
      contentToUse = await this.encryption.decryptText(contentToUse);
    } else {
      // No key - show message
      (share as any).requiresEncryptionKey = true;
      contentToUse = '[This note is encrypted. Sign in with your encryption key to view it.]';
    }
  } catch (err) {
    (share as any).requiresEncryptionKey = true;
    contentToUse = '[Failed to decrypt note...]';
  }
}
```

#### Component Shows Status

```typescript
// In template:
@if (requiresEncryptionKey()) {
  <div class="encryption-warning">
    This note is encrypted. Only the owner can view it.
  </div>
}

// Or if encrypted and can view:
<p class="text-amber-600 dark:text-amber-400">
  <i class="fa-solid fa-lock"></i> This note is encrypted
</p>
```

## Encryption Policy (User-Facing)

### Key Principles

1. **Encryption is owner-only**: Only the owner who encrypted the note can decrypt it
2. **Sharing encrypted notes is possible but limited**: The note can be shared, but viewers can't decrypt it
3. **Three options for sharing encrypted notes**:
   - **Option A**: Keep encrypted (only viewers with the owner's encryption key can see)
   - **Option B**: Disable encryption first, then share
   - **Option C**: Share, but viewers will see "[This note is encrypted...]" message

### Recommended User Actions

**If you want to share an encrypted note:**

1. **Best Practice: Disable encryption first**
   - Open note in dashboard
   - Go to Settings
   - Disable Encryption
   - Share the decrypted note with anyone
   - Result: All viewers see plaintext

2. **Alternative: Share as-is**
   - Share the encrypted note
   - Only viewers with your encryption key can read it
   - Others see a locked message
   - Good for team notes with shared encryption key

## Implementation Details

### Files Modified

| File                                                                | Changes                                                   |
| ------------------------------------------------------------------- | --------------------------------------------------------- |
| `supabase/migrations/.../get_shared_note_rpc.sql`                   | Added `is_encrypted` and `encryption_version` to response |
| `src/app/core/services/share.service.ts`                            | Added decryption logic in `getShareByTokenInternal()`     |
| `src/app/features/notes/pages/public-note/public-note.component.ts` | Added `isEncrypted` and `requiresEncryptionKey` signals   |

### Database Impact

- **No schema change needed**: Just returns existing `is_encrypted` field from notes table
- **RPC function updated**: Includes encryption metadata in response
- **Backward compatible**: Unencrypted notes work exactly as before

### Security Considerations

✅ **Encryption key never exposed**: Key stays in browser memory only  
✅ **Server-side encryption**: RPC never decrypts (that's client-only)  
✅ **Anonymous access unchanged**: Public shares still work normally  
✅ **RLS still in place**: Database RLS policies unchanged  
✅ **No new attack surface**: Encryption handling same as dashboard

## Testing Checklist

- [ ] **Encrypted share, owner views it**: Should see decrypted content
- [ ] **Encrypted share, non-owner views**: Should see "[This note is encrypted...]" message
- [ ] **Encrypted editable share, non-owner edits**: Should save content (even if encrypted)
- [ ] **Owner disables encryption, then shares**: Should see plaintext for all viewers
- [ ] **Multiple refresh cycles**: Encryption flag should persist
- [ ] **Owner signs in while viewing encrypted share**: Should decrypt automatically

## Future Improvements

1. **Encrypted share with team key**: Allow sharing encrypted notes with team members who have the same key
2. **UI enhancement**: Show lock icon for encrypted shares
3. **Re-encryption on save**: Owner can re-encrypt edits in editable shares
4. **Export encrypted**: Allow owner to export shares in encrypted form

## Migration Notes

No database migration needed. The `is_encrypted` field already exists on notes table. We're just:

1. Returning it in the RPC response (new)
2. Handling decryption client-side (new)
3. Showing appropriate message when can't decrypt (new)

All existing data continues to work as-is.
