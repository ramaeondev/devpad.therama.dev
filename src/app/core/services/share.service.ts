import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { NoteService } from './note.service';
import { AuthStateService } from './auth-state.service';
import { PublicShare } from '../models/public-share.model';
import { LoadingService } from './loading.service';
import { DeviceFingerprintService } from './device-fingerprint.service';

@Injectable({ providedIn: 'root' })
export class ShareService {
  private supabase = inject(SupabaseService);
  private noteService = inject(NoteService);
  private authState = inject(AuthStateService);
  private loading = inject(LoadingService);
  private fingerprintService = inject(DeviceFingerprintService);

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
      // Get the note to extract content
      const note = await this.noteService.getNote(noteId, userId);
      if (!note) throw new Error('Note not found');

      // Get unencrypted content
      let publicContent: string | undefined;
      let publicStoragePath: string | undefined;

      if (note.content?.startsWith('storage://')) {
        // File-based note - fetch the actual content for public sharing
        publicStoragePath = note.content;
        
        // For text-based storage files (.md, .txt), fetch and store content
        // This allows anonymous users to view shared content without storage auth
        const path = note.content.replace('storage://', '').split('/');
        if (path.length > 0) {
          const fileName = path[path.length - 1];
          const isTextFile = fileName.endsWith('.md') || fileName.endsWith('.txt');
          
          if (isTextFile) {
            try {
              // Fetch content using authenticated user's access
              publicContent = note.content; // getNote already fetched and returned the content for .md files
            } catch (err) {
              console.error('Failed to fetch file content for sharing:', err);
              publicContent = '[Content unavailable]';
            }
          }
        }
      } else {
        // Text-based note - decrypt if encrypted
        publicContent = note.content || '';
      }

      // Generate unique share token
      const shareToken = this.generateShareToken();

      // Create share record
      const { data, error } = await this.supabase.client
        .from('public_shares')
        .insert({
          note_id: noteId,
          user_id: userId,
          share_token: shareToken,
          permission,
          public_content: publicContent,
          public_storage_path: publicStoragePath,
          expires_at: expiresAt,
          max_views: maxViews,
        })
        .select()
        .single();

      if (error) throw error;

      // Ensure Public folder exists and add note reference
      await this.addToPublicFolder(noteId, userId);

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

    // Fetch the current note content via secure RPC (respects public share access)
    // Avoids RLS blocks when using anon key while ensuring we return live note content
    try {
      const { data: sharedNote, error: rpcError } = await this.supabase.client
        .rpc('get_shared_note', { p_share_token: token });

      const resolvedNote = Array.isArray(sharedNote) ? sharedNote[0] : sharedNote;
      if (!rpcError && resolvedNote) {
        // Prioritize fresh note_content over public_content to ensure viewers see latest edits
        // For text-based notes stored in DB, use note_content directly (always up-to-date)
        if (resolvedNote.note_content && !resolvedNote.note_content.startsWith('storage://')) {
          share.public_content = resolvedNote.note_content;
        }
        // Use public_content if available (populated during share creation for storage notes)
        else if (resolvedNote.public_content) {
          share.public_content = resolvedNote.public_content;
        } 
        // For storage-based notes without public_content, show error message
        else if (resolvedNote.note_content?.startsWith('storage://')) {
          share.public_content = '[This shared note content is not available. The owner may need to re-share this note.]';
        }
      }
    } catch (err) {
      console.error('Error fetching shared note via RPC:', err);
      // Fallback to existing public_content if note fetch fails
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
   * Update public content (for editable shares accessed anonymously)
   */
  async updatePublicContent(shareToken: string, content: string): Promise<void> {
    const userId = this.authState.userId();
    if (!userId) throw new Error('User not authenticated');

    // First verify the share exists and is editable
    const share = await this.getShareByToken(shareToken);
    if (!share) throw new Error('Share not found');
    if (share.permission !== 'editable') throw new Error('Share is not editable');

    const { error } = await this.supabase.client
      .from('public_shares')
      .update({ public_content: content })
      .eq('share_token', shareToken);

    if (error) throw error;
  }

  /**
   * Sync share content when the source note is updated
   * This ensures viewers see the latest content when the owner edits
   */
  async syncShareContent(noteId: string, newContent: string): Promise<void> {
    try {
      // Update all shares for this note with the new content
      const { error } = await this.supabase.client
        .from('public_shares')
        .update({ public_content: newContent })
        .eq('note_id', noteId);

      if (error) {
        console.error('Failed to sync share content:', error);
      }
    } catch (err) {
      console.error('Error syncing share content:', err);
      // Don't throw - this is a background sync operation
    }
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
   */
  async importPublicShare(userId: string, originalShareToken: string): Promise<PublicShare> {
    this.loading.start();
    try {
      // 1. Get original share data
      const originalShare = await this.getShareByToken(originalShareToken);
      if (!originalShare) throw new Error('Share not found');

      // 2. Ensure Public folder exists
      const publicFolder = await this.ensurePublicFolder(userId);

      // 3. Create a new note in the Public folder with the content
      // Note: We use a default title since the public share view might not strictly carry the title depending on permissions/joins, 
      // but ideally we'd want the original title. For now, "Shared Note Copy" is a safe fallback.
      const content = originalShare.public_content || '';
      const title = 'Shared Note Copy'; 

      const newNote = await this.noteService.createNote(userId, {
        title: title,
        content: content,
        folder_id: publicFolder.id,
      });

      // 4. Create a share for this new note so it sticks in the Public folder
      // We make it 'editable' by default since the user owns this copy.
      const newShare = await this.createShare(newNote.id, 'editable');

      return newShare;
    } finally {
      this.loading.stop();
    }
  }

}
