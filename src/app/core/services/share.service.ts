import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { NoteService } from './note.service';
import { AuthStateService } from './auth-state.service';
import { EncryptionService } from './encryption.service';
import { PublicShare } from '../models/public-share.model';
import { LoadingService } from './loading.service';
import { DeviceFingerprintService } from './device-fingerprint.service';
import { ActivityLogService } from './activity-log.service';

@Injectable({ providedIn: 'root' })
export class ShareService {
  private supabase = inject(SupabaseService);
  private noteService = inject(NoteService);
  private authState = inject(AuthStateService);
  private loading = inject(LoadingService);
  private fingerprintService = inject(DeviceFingerprintService);
  private encryption = inject(EncryptionService);
  private activityLog = inject(ActivityLogService);

  /**
   * Generate a unique share token
   */
  private generateShareToken(): string {
    return crypto.randomUUID();
  }

  /**
   * Generate full share URL from token
   */
  generateShareUrl(token: string): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/share/${token}`;
  }

  /**
   * Create a public share for a note
   */
  async createShare(
    noteId: string, 
    permission: 'readonly' | 'editable', 
    expiresAt?: string | null, // explicitly allow null
    maxViews?: number | null   // explicitly allow null
  ): Promise<PublicShare> {
    const userId = this.authState.userId();
    if (!userId) throw new Error('User not authenticated');

    this.loading.start();
    try {
      // Get the note to verify it exists
      const note = await this.noteService.getNote(noteId, userId);
      if (!note) throw new Error('Note not found');

      // DECRYPT AT SOURCE: If note is encrypted, decrypt it so shared version is readable
      // This maintains single source of truth while making content accessible to anonymous users
      if ((note as any).is_encrypted) {
        console.log('[createShare] Note is encrypted, decrypting at source for public sharing...');
        try {
          await this.noteService.decryptNoteAtSource(noteId, userId);
          console.log('[createShare] Note decrypted successfully');
        } catch (decryptErr) {
          console.error('[createShare] Failed to decrypt note:', decryptErr);
          throw new Error('Failed to decrypt note for sharing. Please ensure you have the encryption key loaded.');
        }
      }

      // Generate unique share token
      const shareToken = this.generateShareToken();

      // Create share record
      // NOTE: We no longer store public_content here - content is fetched on-demand via RPC
      // This ensures single source of truth: all content comes from notes.content
      const { data, error } = await this.supabase.client
        .from('public_shares')
        .insert({
          note_id: noteId,
          user_id: userId,
          share_token: shareToken,
          permission,
          expires_at: expiresAt,
          max_views: maxViews,
          // public_content and public_storage_path are now deprecated
          // Content is fetched dynamically via get_shared_note RPC function
        })
        .select()
        .single();

      if (error) throw error;

      // Ensure Public folder exists and add note reference
      await this.addToPublicFolder(noteId, userId);

      // Log activity
      await this.activityLog.logActivity(userId, {
        action_type: 'share',
        resource_type: 'note',
        resource_id: noteId,
        resource_name: note.title,
        metadata: { permission, share_token: shareToken }
      });

      return data as PublicShare;
    } finally {
      this.loading.stop();
    }
  }

  /**
   * Get share by token WITHOUT incrementing view count
   * Use this for fetching share data and content for display
   */
  private async getShareByTokenInternal(token: string): Promise<PublicShare | null> {
    const { data: share, error } = await this.supabase.client
      .from('public_shares')
      .select('*')
      .eq('share_token', token)
      .single();

    if (error || !share) {
      if (error) console.error('Error fetching share:', error);
      return null;
    }

      // Check expiration by date
      if (share.expires_at && new Date(share.expires_at) < new Date()) {
        return null; // Expired
      }

      // Check max views (if set)
      // Note: view_count is the *current* count before this access
      if (share.max_views !== null && share.view_count >= share.max_views) {
        return null; // View limit reached
      }

      // Log view activity for the note owner (if authenticated viewer)
      const currentUserId = this.authState.userId();
      if (currentUserId && currentUserId !== share.user_id) {
        // Log that someone else viewed their shared note
        await this.activityLog.logActivity(share.user_id, {
          action_type: 'view',
          resource_type: 'share',
          resource_id: share.id,
          resource_name: share.note_title,
          metadata: { viewer_id: currentUserId, share_token: token }
        });
      }    // Fetch the current note content via secure RPC (respects public share access)
    // Avoids RLS blocks when using anon key while ensuring we return live note content
    try {
      const { data: sharedNote, error: rpcError } = await this.supabase.client
        .rpc('get_shared_note', { p_share_token: token });

      const resolvedNote = Array.isArray(sharedNote) ? sharedNote[0] : sharedNote;
      if (!rpcError && resolvedNote) {
        // Capture note title from RPC response
        if (resolvedNote.note_title) {
          share.note_title = resolvedNote.note_title;
        }
        
        // SINGLE SOURCE OF TRUTH: Use note_content directly from RPC
        // No more public_content duplication - all content comes from notes.content
        let contentToUse = resolvedNote.note_content || '';
        
        // STORAGE HANDLING: If content is a storage path, fetch the actual file
        if (contentToUse && contentToUse.startsWith('storage://')) {
          try {
            // Fetch the actual file content using signed URLs (works with anon key)
            contentToUse = await this.noteService.fetchStorageContent(contentToUse);
          } catch (storageErr) {
            console.error('Error fetching storage content:', storageErr);
            contentToUse = '[Content unavailable - the file may have been moved or deleted. Please contact the note owner.]';
          }
        }
        
        // ENCRYPTION HANDLING:
        // If note is encrypted, we need the owner's encryption key to decrypt
        // The client will have the key IF the user viewing is the owner or logged in with key loaded
        if (resolvedNote.is_encrypted && contentToUse && !contentToUse.startsWith('[')) {
          try {
            // Check if we have an encryption key available
            if (this.encryption.hasKey()) {
              // Decrypt the content for display
              contentToUse = await this.encryption.decryptText(contentToUse);
            } else {
              // Mark content as encrypted so client can show appropriate message
              (share as any).requiresEncryptionKey = true;
              contentToUse = '[This note is encrypted. Sign in with your encryption key to view it.]';
            }
          } catch (decryptErr) {
            console.warn('Failed to decrypt shared note content:', decryptErr);
            (share as any).requiresEncryptionKey = true;
            contentToUse = '[Failed to decrypt note. It may require the owner\'s encryption key.]';
          }
        }
        
        (share as any).content = contentToUse;
        (share as any).isEncrypted = resolvedNote.is_encrypted;
      }
    } catch (err) {
      console.error('Error fetching shared note via RPC:', err);
    }

    return share as PublicShare;
  }

  /**
   * Get share by token (for anonymous access)
   * Includes validation for expiry and view limits
   * Increments view count on initial load only
   */
  async getShareByToken(token: string): Promise<PublicShare | null> {
    const share = await this.getShareByTokenInternal(token);
    if (share) {
      // Only increment view count on initial load, not on refresh
      await this.incrementViewCount(share.id);
    }
    return share;
  }

  /**
   * Get share and content for refresh without incrementing views
   * Use for auto-refresh to fetch updated content without counting as a new view
   */
  async getShareContentForRefresh(token: string): Promise<PublicShare | null> {
    // Don't increment view count on refresh - only initial load counts
    return this.getShareByTokenInternal(token);
  }

  /**
   * Get all shares for a note
   */
  async getSharesForNote(noteId: string): Promise<PublicShare[]> {
    const userId = this.authState.userId();
    if (!userId) throw new Error('User not authenticated');

    const { data, error } = await this.supabase.client
      .from('public_shares')
      .select('*')
      .eq('note_id', noteId)
      .eq('user_id', userId);

    if (error) throw error;

    return (data as PublicShare[]) || [];
  }

  /**
   * Update share settings (permission, expiry)
   */
  async updatePublicShare(
    shareId: string, 
    updates: { 
      permission?: 'readonly' | 'editable',
      expires_at?: string | null,
      max_views?: number | null
    }
  ): Promise<void> {
    const userId = this.authState.userId();
    if (!userId) throw new Error('User not authenticated');

    const { error } = await this.supabase.client
      .from('public_shares')
      .update(updates)
      .eq('id', shareId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  /**
   * Update share permission (legacy wrapper, prefer updatePublicShare)
   */
  async updateSharePermission(shareId: string, permission: 'readonly' | 'editable'): Promise<void> {
    return this.updatePublicShare(shareId, { permission });
  }

  /**
   * Delete a share
   */
  async deleteShare(shareId: string): Promise<void> {
    const userId = this.authState.userId();
    if (!userId) throw new Error('User not authenticated');

    this.loading.start();
    try {
      // Get share details before deleting
      const { data: share } = await this.supabase.client
        .from('public_shares')
        .select('*')
        .eq('id', shareId)
        .eq('user_id', userId)
        .single();

      if (!share) throw new Error('Share not found');

      // Delete the share record
      const { error } = await this.supabase.client
        .from('public_shares')
        .delete()
        .eq('id', shareId)
        .eq('user_id', userId);

      if (error) throw error;

      // Log unshare activity
      await this.activityLog.logActivity(userId, {
        action_type: 'unshare',
        resource_type: 'note',
        resource_id: share.note_id,
        resource_name: share.note_title || 'Shared Note',
        metadata: { share_token: share.share_token, permission: share.permission }
      });

      // Check if there are any other shares for this note
      const otherShares = await this.getSharesForNote(share.note_id);
      
      // If no other shares exist, remove from Public folder
      if (otherShares.length === 0) {
        await this.removeFromPublicFolder(share.note_id, userId);
      }
    } finally {
      this.loading.stop();
    }
  }

  /**
   * Update note content for editable shares
   * This allows signed-in viewers to edit shared content by directly updating storage
   * Uses Supabase service account to bypass RLS since share token grants access
   */
  async updatePublicContent(shareToken: string, content: string): Promise<void> {
    // Verify authentication
    const userId = this.authState.userId();
    if (!userId) throw new Error('Authentication required to edit shared notes');

    // Verify the share exists and is editable
    const share = await this.getShareByToken(shareToken);
    if (!share) throw new Error('Share not found');
    if (share.permission !== 'editable') throw new Error('Share is not editable');

    try {
      // Update storage file directly
      const path = `${share.user_id}/${share.note_id}.md`;
      const file = new File([content], `${share.note_id}.md`, { type: 'text/markdown' });
      
      const { error: uploadErr } = await this.supabase.client.storage
        .from('notes')
        .upload(path, file, { 
          upsert: true, 
          contentType: 'text/markdown'
        });

      if (uploadErr) {
        console.error('Storage upload error:', uploadErr);
        throw new Error('Failed to save changes to storage');
      }

      // Update the note's updated_at timestamp
      const { error: updateErr } = await this.supabase.client
        .from('notes')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', share.note_id);

      if (updateErr) {
        console.warn('Failed to update timestamp:', updateErr);
        // Don't throw - content was saved successfully
      }

      // Log edit activity for the note owner (if edited by someone else)
      if (userId !== share.user_id) {
        await this.activityLog.logActivity(share.user_id, {
          action_type: 'edit',
          resource_type: 'share',
          resource_id: share.id,
          resource_name: share.note_title || 'Shared Note',
          metadata: { editor_id: userId, share_token: shareToken }
        });
      }
    } catch (err) {
      console.error('Failed to update note content:', err);
      throw err;
    }
  }

  /**
   * DEPRECATED: Sync share content when the source note is updated
   * No longer needed - with single source of truth, all shares fetch latest content via RPC
   * @deprecated Use direct RPC calls which automatically return latest note.content
   */
  async syncShareContent(_noteId: string, _newContent: string): Promise<void> {
    // This method is kept for backward compatibility but no longer does anything
    // Shares will automatically reflect changes when they call get_shared_note RPC
    console.warn('syncShareContent is deprecated - RPC now returns live content from notes.content');
    // No-op: previously we would update public_shares.public_content for all shares
    // Now shares fetch content live via RPC, so nothing to sync here
    return;
  }

  /**
   * Increment view count for a share
   */
  /**
   * Track share access (increment view count and unique view count)
   */
  private async incrementViewCount(shareId: string): Promise<void> {
    const fingerprint = await this.fingerprintService.getDeviceFingerprint();

    // Use RPC to track access
    const { error } = await this.supabase.client.rpc('track_share_access', {
      p_share_id: shareId,
      p_fingerprint: fingerprint
    });

    if (error) {
      console.error('Error tracking share access:', error);
      // Fallback: just increment view count manually if RPC fails
      const { data: share } = await this.supabase.client
        .from('public_shares')
        .select('view_count')
        .eq('id', shareId)
        .single();
      
      if (share) {
        await this.supabase.client
          .from('public_shares')
          .update({
            view_count: share.view_count + 1,
            last_accessed_at: new Date().toISOString(),
          })
          .eq('id', shareId);
      }
    }
  }

  /**
   * Ensure Public folder exists and add note to it
   */
  private async addToPublicFolder(_noteId: string, userId: string): Promise<void> {
    // Get or create Public folder
    await this.ensurePublicFolder(userId);

    // Note: This doesn't move the note, just ensures Public folder exists
    // Dual visibility will be handled via the public_shares table
    // The Public folder will show all notes that have active shares
  }

  /**
   * Remove note from Public folder
   */
  private async removeFromPublicFolder(_noteId: string, _userId: string): Promise<void> {
    // This will be implemented when we handle the dual visibility properly
    // For now, it's a placeholder
  }

  /**
   * Ensure Public folder exists for user
   */
  async ensurePublicFolder(userId: string): Promise<any> {
    // Check if user already has a Public folder
    const { data: profile } = await this.supabase.client
      .from('user_profiles')
      .select('public_folder_id')
      .eq('user_id', userId)
      .single();

    if (profile?.public_folder_id) {
      // Public folder already exists
      const { data: folder } = await this.supabase.client
        .from('folders')
        .select('*')
        .eq('id', profile.public_folder_id)
        .maybeSingle();
      
      if (folder) {
        return folder;
      }
      // If folder not found (deleted?), continue to create new one
    }

    // 2. Check if a folder named "Public" already exists (but not linked)
    // This prevents duplicate key errors if the profile link was lost but folder remains
    const { data: existingPublic } = await this.supabase.client
      .from('folders')
      .select('*')
      .eq('user_id', userId)
      .eq('name', 'Public')
      .is('parent_id', null)
      .maybeSingle();

    if (existingPublic) {
      // Found it! Link it and return
      await this.supabase.client
        .from('user_profiles')
        .update({ public_folder_id: existingPublic.id })
        .eq('user_id', userId);
        
      return existingPublic;
    }

    // 3. Create Public folder at the same level as root (parent_id: null, but is_root: false)
    // This is done directly via Supabase to avoid the unique constraint on is_root
    const { data: publicFolder, error } = await this.supabase.client
      .from('folders')
      .insert({
        name: 'Public',
        user_id: userId,
        parent_id: null,
        is_root: false, // Explicitly set to false to avoid unique constraint
        icon: 'fa-globe', // Distinctive icon for Public folder
      })
      .select()
      .single();

    if (error) throw error;

    // Update user profile with Public folder ID
    await this.supabase.client
      .from('user_profiles')
      .update({ public_folder_id: publicFolder.id })
      .eq('user_id', userId);

    return publicFolder;
  }

  /**
   * Ensure Imports folder exists for user
   */
  async ensureImportsFolder(userId: string): Promise<any> {
    // 1. Check if user already has an Imports folder linked in profile
    const { data: profile } = await this.supabase.client
      .from('user_profiles')
      .select('imports_folder_id')
      .eq('user_id', userId)
      .single();

    if (profile?.imports_folder_id) {
      const { data: folder } = await this.supabase.client
        .from('folders')
        .select('*')
        .eq('id', profile.imports_folder_id)
        .maybeSingle();
      
      if (folder) {
        return folder;
      }
    }

    // 2. Check if folder named "Imports" already exists at root level (but not linked in profile)
    const { data: existingImports } = await this.supabase.client
      .from('folders')
      .select('*')
      .eq('user_id', userId)
      .eq('name', 'Imports')
      .is('parent_id', null)
      .maybeSingle();

    if (existingImports) {
      // Found it! Link it in profile and return
      await this.supabase.client
        .from('user_profiles')
        .update({ imports_folder_id: existingImports.id })
        .eq('user_id', userId);
        
      return existingImports;
    }

    // 3. Create new Imports folder at root level
    const { data: importsFolder, error } = await this.supabase.client
      .from('folders')
      .insert({
        name: 'Imports',
        user_id: userId,
        parent_id: null,
        is_root: false,
        icon: 'fa-download',
      })
      .select()
      .single();

    if (error) throw error;

    // Link in profile
    await this.supabase.client
      .from('user_profiles')
      .update({ imports_folder_id: importsFolder.id })
      .eq('user_id', userId);

    return importsFolder;
  }

  /**
   * Get all notes that have active shares for a user (for Public folder display)
   */
  async getSharedNotesForUser(userId: string): Promise<any[]> {
    const { data, error } = await this.supabase.client
      .from('public_shares')
      .select(`
        id,
        note_id,
        permission,
        view_count,
        created_at,
        notes (
          id,
          title,
          content,
          folder_id,
          updated_at
        )
      `)
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching shared notes:', error);
      return [];
    }

    // Map to note format with share info
    return (data || []).map((share: any) => ({
      id: share.notes.id,
      title: share.notes.title,
      content: share.notes.content,
      folder_id: share.notes.folder_id,
      updated_at: share.notes.updated_at,
      share_id: share.id,
      share_permission: share.permission,
      share_views: share.view_count,
    }));
  }

  /**
   * Import a public share to the user's account (Copy/Fork)
   * Creates a new note with the original's title and content, then creates a share
   */
  async importPublicShare(userId: string, originalShareToken: string): Promise<PublicShare> {
    this.loading.start();
    try {
      // 1. Get original share data
      const originalShare = await this.getShareByToken(originalShareToken);
      if (!originalShare) throw new Error('Share not found');

      // 2. Ensure Imports folder exists (forked notes go to Imports)
      const importsFolder = await this.ensureImportsFolder(userId);

      // 3. Create a new note in the Imports folder with the content
      const content = (originalShare as any).content || '';
      const title = originalShare.note_title || originalShare.share_token || 'Shared Note Copy';

      const newNote = await this.noteService.createNote(userId, {
        title: title,
        content: content,
        folder_id: importsFolder.id,
      });

      // Log fork activity for the original note owner
      await this.activityLog.logActivity(originalShare.user_id, {
        action_type: 'fork',
        resource_type: 'share',
        resource_id: originalShare.id,
        resource_name: originalShare.note_title,
        metadata: { forked_by: userId, new_note_id: newNote.id }
      });

      // 4. Create a share for this forked note (makes it editable by the user)
      const newShare = await this.createShare(newNote.id, 'editable');

      return newShare;
    } finally {
      this.loading.stop();
    }
  }

}
