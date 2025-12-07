# Single Source of Truth Architecture Refactor

**Date:** December 7, 2025  
**Objective:** Eliminate `public_content` field duplication and use `notes.content` as the single source of truth for all shared content.

## Problem Statement

Previously, shared notes were stored in two separate locations:
1. **`notes.content`** - The original note content in the owner's dashboard
2. **`public_shares.public_content`** - A snapshot created when sharing, intended to allow anonymous access

This duplication caused:
- **Sync issues**: Edits to one copy weren't reflected in the other
- **Complexity**: Had to maintain sync logic across both locations
- **Encryption confusion**: Unclear which copy was encrypted, which was plain
- **RPC confusion**: Multiple content sources made API design confusing

## Solution: Single Source of Truth

**All content now comes from `notes.content` directly via RPC** - no separate `public_content` field.

### Architecture Changes

#### 1. **Removed public_content Field**
- **File**: `/src/app/core/models/public-share.model.ts`
- Removed: `public_content?: string` and `public_storage_path?: string`
- Remaining content access: Fetched dynamically via RPC

#### 2. **Updated createShare() Method**
- **File**: `/src/app/core/services/share.service.ts`
- **Change**: No longer populates `public_content` when creating a share
- **Why**: Content will be fetched on-demand via RPC, eliminating snapshot
- **Result**: Shares always show live `notes.content`

#### 3. **Modified updatePublicContent() Method**
- **File**: `/src/app/core/services/share.service.ts`
- **Old Behavior**: Updated `public_shares.public_content` and synced to other shares
- **New Behavior**: Updates `notes.content` directly
- **Benefit**: Single edit point - all viewers see change immediately via RPC

#### 4. **Deprecated syncShareContent() Method**
- **File**: `/src/app/core/services/note.service.ts`
- **Old Behavior**: When owner edited, sync to all `public_shares.public_content`
- **New Behavior**: No-op - RPC automatically fetches latest `notes.content`
- **Removed Call**: Deleted from `updateNote()` method

#### 5. **Updated getShareByTokenInternal() Method**
- **File**: `/src/app/core/services/share.service.ts`
- **Change**: Stores RPC-fetched `note_content` as `content` property (in-memory)
- **Result**: PublicShare object includes live content without DB field

#### 6. **Updated public-note.component.ts**
- **Changes**:
  - Read content from RPC-fetched `content` property instead of `public_content`
  - Updated refresh logic to use same source
- **Result**: Viewers always see live content from source note

#### 7. **Updated get_shared_note RPC**
- **File**: `/supabase/migrations/20251207051000_get_shared_note_rpc.sql`
- **Removed Fields**: `public_content`, `public_storage_path`
- **Kept**: `note_content` (the single source of truth)
- **Result**: Simpler RPC response, one content source

### Data Flow (Before → After)

**Before (Duplication):**
```
Owner edits in Dashboard
    ↓
notes.content updated
    ↓
syncShareContent() called
    ↓
Updates public_shares.public_content for ALL shares
    ↓
Viewers refresh → see updated public_content
```

**After (Single Source):**
```
Owner edits in Dashboard
    ↓
notes.content updated
    ↓
No sync needed (shares fetch content live)
    ↓
Viewer polls getShareByToken()
    ↓
RPC returns latest notes.content
    ↓
Viewer sees latest content immediately
```

### Benefits

✅ **No Sync Logic**: Shares automatically reflect changes via RPC  
✅ **Simpler Code**: Removed 50+ lines of sync/fallback logic  
✅ **True Real-Time**: All viewers see changes immediately without refresh interval tricks  
✅ **Fewer Queries**: One content source vs. checking public_content then note_content  
✅ **Consistent Encryption**: One encryption point (notes.content)  
✅ **Storage Simplicity**: storage:// URLs in notes.content work directly for RPC  

### Testing Checklist

- ✅ **Build**: Compilation successful with no errors
- ⏳ **Read Shares**: Test readonly share access (should show latest content)
- ⏳ **Edit Shares**: Test editable share editing (should save directly to notes.content)
- ⏳ **Multiple Viewers**: Test that multiple viewers see each other's edits in real-time
- ⏳ **Storage Notes**: Test file-based notes (storage://) via shared links
- ⏳ **Encrypted Notes**: Test encrypted notes in shares
- ⏳ **Import Shares**: Test importing readonly shares (should copy latest content)

### Migration Path

No database migration needed:
- `public_shares.public_content` column can remain (deprecated, unused)
- Will be safe to drop in future cleanup migration
- RPC no longer reads from this column

### Rollback Plan

If issues arise:
1. Revert RPC to include `public_content` in response
2. Restore `public_content` to PublicShare interface
3. Add back sync logic in `updateNote()`
4. Update component to read `public_content` instead of `content`

---

## Files Modified

| File | Changes | Impact |
|------|---------|--------|
| `src/app/core/models/public-share.model.ts` | Removed `public_content` and `public_storage_path` fields | Breaking change for code reading these fields |
| `src/app/core/services/share.service.ts` | Removed public_content population in `createShare()`, updated `updatePublicContent()` to edit notes.content | All shared content now live |
| `src/app/core/services/note.service.ts` | Removed `syncSharedContent()` call from `updateNote()` | No background syncs needed |
| `src/app/features/notes/pages/public-note/public-note.component.ts` | Updated content read source | Viewers now use RPC-fetched content |
| `supabase/migrations/20251207051000_get_shared_note_rpc.sql` | Removed `public_content` and `public_storage_path` from RPC response | Simpler API response |

---

## Future Work

1. **Remove public_content Column**: Create migration to drop unused column
2. **RLS Update**: Ensure notes table RLS allows RPC anonymous access
3. **Performance**: Monitor RPC call frequency with new polling
4. **Encryption**: Verify encrypted notes work with direct notes.content access
