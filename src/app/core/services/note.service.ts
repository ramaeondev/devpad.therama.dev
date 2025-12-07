import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { CreateNoteDto, Note, UpdateNoteDto } from '../models/note.model';
import { LoadingService } from './loading.service';
import { EncryptionService } from './encryption.service';
import { ActivityLogService } from './activity-log.service';

@Injectable({ providedIn: 'root' })
export class NoteService {
  private supabase = inject(SupabaseService);
  private loading = inject(LoadingService);
  private encryption = inject(EncryptionService);
  private activityLog = inject(ActivityLogService);
  private readonly BUCKET = 'notes';

  private shouldEncrypt(): boolean {
    return this.encryption.hasKey();
  }

  // Small helper to verify an uploaded file can be downloaded and is non-empty.
  private async verifyUpload(path: string): Promise<void> {
    try {
      // Use a signed URL to verify retrieval (works for private buckets)
      const { data: urlData, error: urlErr } = await this.supabase.storage
        .from(this.BUCKET)
        .createSignedUrl(path, 60);
      if (urlErr || !urlData?.signedUrl) {
        console.warn('Could not create signed URL for verification', urlErr);
        throw urlErr || new Error('Signed URL creation failed');
      }
      const resp = await fetch(urlData.signedUrl);
      if (!resp.ok) {
        console.warn('Signed URL verification fetch failed', resp.status);
        throw new Error(`Signed URL fetch failed: ${resp.status}`);
      }
      const txt = await resp.text();
      if (!txt || txt.length === 0) {
        console.warn('Uploaded file appears empty during verification', path);
        throw new Error('Uploaded file is empty');
      }
    } catch (e) {
      // Rethrow for callers to surface as an error
      throw e;
    }
  }

  async createNote(userId: string, dto: CreateNoteDto): Promise<Note> {
    return this.loading.withLoading(async () => {
      // Step 1: create a stub to get the note id
      const { data: created, error: createErr } = await this.supabase
        .from('notes')
        .insert({
          title: dto.title,
          content: '', // will be replaced with storage path
          folder_id: dto.folder_id ?? null,
          user_id: userId,
          tags: dto.tags ?? [],
        })
        .select()
        .single();
      if (createErr) throw createErr;

      const note = created as Note;
      // Step 2: upload content to storage (even if empty, create the file for consistency)
      // Use a deterministic path for each note and upload using File for browser compatibility
      const path = `${userId}/${note.id}.md`;
      let contentStr = typeof dto.content === 'string' ? dto.content : (dto.content ?? '');

      let isEncrypted = false;
      if (this.shouldEncrypt() && contentStr) {
        try {
          contentStr = await this.encryption.encryptText(contentStr);
          isEncrypted = true;
        } catch (e) {
          console.warn('Encryption failed; falling back to plaintext', e);
        }
      }
      // Use File which works well in browsers and keeps metadata
      const file = new File([contentStr], `${note.id}.md`, { type: 'text/markdown' });
      const { error: uploadErr } = await this.supabase.storage
        .from(this.BUCKET)
        .upload(path, file, { upsert: true, contentType: 'text/markdown' });
      if (uploadErr) throw uploadErr;

      // Verify upload succeeded and file is retrievable (helps catch permission/multipart issues)
      // Skip verification for intentionally empty files: empty notes are allowed.
      if (contentStr && contentStr.length > 0) {
        await this.verifyUpload(path);
      }

      // Step 3: update row to reference storage path (use storage:// scheme in content field)
      const storageRef = `storage://${this.BUCKET}/${path}`;
      const updateRow: any = { content: storageRef, updated_at: new Date().toISOString() };
      if (isEncrypted) {
        updateRow.is_encrypted = true;
        updateRow.encryption_version = 'v1';
      }

      const { data: updated, error: updateErr } = await this.supabase
        .from('notes')
        .update(updateRow)
        .eq('id', note.id)
        .eq('user_id', userId)
        .select()
        .single();
      if (updateErr) throw updateErr;
      
      // Log activity
      await this.activityLog.logActivity(userId, {
        action_type: 'create',
        resource_type: 'note',
        resource_id: note.id,
        resource_name: dto.title,
      });
      
      // Return the note with fetched content instead of storage path
      // This ensures the note editor has the actual content ready to display
      const finalNote = updated as Note;
      if (finalNote.content?.startsWith('storage://')) {
        // Fetch content for new note immediately
        try {
          const fetchedNote = await this.getNote(finalNote.id, userId);
          if (fetchedNote) {
            return fetchedNote;
          }
        } catch (err) {
          console.warn('Failed to fetch created note content:', err);
        }
      }
      return finalNote;
    });
  }

  async updateNote(noteId: string, userId: string, dto: UpdateNoteDto): Promise<Note> {
    return this.loading.withLoading(async () => {
      // Fetch current row to determine storage ref
      const { data: current, error: getErr } = await this.supabase
        .from('notes')
        .select('*')
        .eq('id', noteId)
        .eq('user_id', userId)
        .single();
      if (getErr) throw getErr;
      const cur = current as Note & { content?: string };

      // Always target a deterministic path for the note file
      const expectedPath = `${userId}/${noteId}.md`;
      let storageRef = `storage://${this.BUCKET}/${expectedPath}`;

      const updatePayload: any = {
        updated_at: new Date().toISOString(),
      };

      if (!cur.content || !cur.content.startsWith('storage://')) {
        // Previous rows stored raw content in DB; migrate that content (or dto.content if provided)
        let migrateContent = dto.content !== undefined ? (dto.content as string) : (cur.content || '');
        let isEncrypted = false;
        if (this.shouldEncrypt() && migrateContent) {
          try {
            migrateContent = await this.encryption.encryptText(migrateContent);
            isEncrypted = true;
          } catch (e) {
            console.warn('Encryption failed; falling back to plaintext', e);
          }
        }
        const file = new File([migrateContent], `${noteId}.md`, { type: 'text/markdown' });
        const { error: uploadErr } = await this.supabase.storage
          .from(this.BUCKET)
          .upload(expectedPath, file, { upsert: true, contentType: 'text/markdown' });
        if (uploadErr) throw uploadErr;
        // Only verify when migrated content is non-empty
        if (migrateContent && migrateContent.length > 0) {
          await this.verifyUpload(expectedPath);
        }
        storageRef = `storage://${this.BUCKET}/${expectedPath}`;
        // If we encrypted during migration, mark flags
        if (isEncrypted) {
          updatePayload.is_encrypted = true;
          updatePayload.encryption_version = 'v1';
        }
      } else {
        // File already stored in storage; if new content provided, overwrite the deterministic path
        if (dto.content !== undefined) {
          let newContent = dto.content as string;
          let isEncrypted = false;
          if (this.shouldEncrypt() && newContent) {
            try {
              newContent = await this.encryption.encryptText(newContent);
              isEncrypted = true;
            } catch (e) {
              console.warn('Encryption failed; falling back to plaintext', e);
            }
          }
          const file = new File([newContent], `${noteId}.md`, { type: 'text/markdown' });
          const { error: upErr } = await this.supabase.storage
            .from(this.BUCKET)
            .upload(expectedPath, file, { upsert: true, contentType: 'text/markdown' });
          if (upErr) throw upErr;
          // Only verify when provided content is non-empty
          if (dto.content && (dto.content as string).length > 0) {
            await this.verifyUpload(expectedPath);
          }
          storageRef = `storage://${this.BUCKET}/${expectedPath}`;
          if (isEncrypted) {
            updatePayload.is_encrypted = true;
            updatePayload.encryption_version = 'v1';
          }
        } else {
          // keep existing storageRef if no content provided
          storageRef = cur.content;
        }
      }

      

      // Only include fields that are explicitly provided
      if (dto.title !== undefined) updatePayload.title = dto.title;
      if (dto.content !== undefined || !cur.content || !cur.content.startsWith('storage://')) {
        updatePayload.content = storageRef;
      }
      if (dto.folder_id !== undefined) updatePayload.folder_id = dto.folder_id;
      if (dto.tags !== undefined) updatePayload.tags = dto.tags;
      if (dto.is_favorite !== undefined) updatePayload.is_favorite = dto.is_favorite;
      if (dto.is_archived !== undefined) updatePayload.is_archived = dto.is_archived;

      const { data, error } = await this.supabase
        .from('notes')
        .update(updatePayload)
        .eq('id', noteId)
        .eq('user_id', userId)
        .select()
        .single();
      if (error) throw error;
      
      // Log activity
      await this.activityLog.logActivity(userId, {
        action_type: 'edit',
        resource_type: 'note',
        resource_id: noteId,
        resource_name: dto.title || cur.title,
      });

      // SINGLE SOURCE OF TRUTH: No longer syncing shares
      // All shares fetch note.content directly via RPC, so no separate sync needed
      
      return data as Note;
    });
  }

  async deleteNote(noteId: string, userId: string): Promise<void> {
    return this.loading.withLoading(async () => {
      // Fetch note details before deletion for logging
      const { data: note } = await this.supabase
        .from('notes')
        .select('title')
        .eq('id', noteId)
        .eq('user_id', userId)
        .single();
      
      const { error } = await this.supabase
        .from('notes')
        .delete()
        .eq('id', noteId)
        .eq('user_id', userId);
      if (error) throw error;
      
      // Log activity
      await this.activityLog.logActivity(userId, {
        action_type: 'delete',
        resource_type: 'note',
        resource_id: noteId,
        resource_name: note?.title || 'Untitled',
      });
    });
  }

  async getNote(noteId: string, userId: string): Promise<Note | null> {
    return this.loading.withLoading(async () => {
      const { data, error } = await this.supabase
        .from('notes')
        .select('*')
        .eq('id', noteId)
        .eq('user_id', userId)
        .single();
      if (error) {
        if ((error as any).code === 'PGRST116') return null;
        throw error;
      }
      const note = data as Note & { content?: string };
      const contentField = note.content || '';
      if (contentField.startsWith('storage://')) {
        // Parse storage path
        const path = contentField.replace(`storage://${this.BUCKET}/`, '');
        // Only fetch content for text/markdown files, keep storage path for binary files
        const isTextFile = path.endsWith('.md') || path.endsWith('.txt');
        if (isTextFile) {
          const { data: urlData, error: urlErr } = await this.supabase.storage
            .from(this.BUCKET)
            .createSignedUrl(path, 60);
          if (urlErr || !urlData?.signedUrl) {
            throw urlErr || new Error('Signed URL could not be created');
          }
          const resp = await fetch(urlData.signedUrl);
          if (!resp.ok) throw new Error(`Signed URL fetch failed: ${resp.status}`);
          let signedText = await resp.text();
          try {
            // Decrypt if data is encrypted and we have a key
            const isEnc = (note as any).is_encrypted === true || signedText.startsWith('enc:');
            if (isEnc && this.encryption.hasKey()) {
              signedText = await this.encryption.decryptText(signedText);
            }
          } catch (e) {
            console.warn('Decryption failed; returning raw content', e);
          }
          return { ...(note as Note), content: signedText } as Note;
        }
        // For binary files, keep the storage path as content
        return note as Note;
      }
      return note as Note;
    });
  }

  async getNotesForFolder(folderId: string | null, userId: string): Promise<Note[]> {
    return this.loading.withLoading(async () => {
      let query = this.supabase.from('notes').select('*').eq('user_id', userId);
      if (folderId) {
        query = query.eq('folder_id', folderId);
      } else {
        query = query.is('folder_id', null);
      }
      const { data, error } = await query.order('updated_at', { ascending: false });
      if (error) throw error;
      return data as Note[];
    });
  }

  async uploadDocument(userId: string, file: File, folderId: string | null): Promise<Note> {
    return this.loading.withLoading(async () => {
      // Validate file size
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File size exceeds 5MB limit');
      }

      // Validate file type - block executables
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const blockedExtensions = [
        'exe',
        'bat',
        'cmd',
        'com',
        'pif',
        'scr',
        'vbs',
        'wsh',
        'jar',
        'dll',
        'msi',
        'reg',
        'pif',
        'hta',
      ];
      if (blockedExtensions.includes(ext)) {
        throw new Error('Executable files are not allowed');
      }

      // Step 1: create a stub note
      const { data: created, error: createErr } = await this.supabase
        .from('notes')
        .insert({
          title: file.name,
          content: '', // will be replaced with storage path
          folder_id: folderId,
          user_id: userId,
          tags: [],
        })
        .select()
        .single();
      if (createErr) throw createErr;

      const note = created as Note;

      // Step 2: upload file to storage (encrypt if enabled)
      const path = `${userId}/${note.id}.${ext}`;
      let toUpload: Blob | File = file;
      let isEncrypted = false;
      if (this.shouldEncrypt()) {
        try {
          toUpload = await this.encryption.encryptBlob(file);
          isEncrypted = true;
        } catch (e) {
          console.warn('File encryption failed; uploading plaintext', e);
        }
      }
      const { error: uploadErr } = await this.supabase.storage
        .from(this.BUCKET)
        .upload(path, toUpload, { upsert: true, contentType: file.type || 'application/octet-stream' });
      if (uploadErr) throw uploadErr;

      // Verify upload
      await this.verifyUpload(path);

      // Step 3: update note with storage ref
      const storageRef = `storage://${this.BUCKET}/${path}`;
      const updateRow: any = { content: storageRef, updated_at: new Date().toISOString() };
      if (isEncrypted) {
        updateRow.is_encrypted = true;
        updateRow.encryption_version = 'v1';
      }

      const { data: updated, error: updateErr } = await this.supabase
        .from('notes')
        .update(updateRow)
        .eq('id', note.id)
        .eq('user_id', userId)
        .select()
        .single();
      if (updateErr) throw updateErr;
      
      // Log activity
      await this.activityLog.logActivity(userId, {
        action_type: 'upload',
        resource_type: 'note',
        resource_id: note.id,
        resource_name: file.name,
        metadata: {
          file_size: file.size,
          file_type: file.type,
        },
      });
      
      return updated as Note;
    });
  }

  // Helpers for encrypted file retrieval
  async getFileBlob(noteId: string, userId: string): Promise<Blob> {
    const note = await this.getNote(noteId, userId);
    if (!note) throw new Error('Note not found');
    const contentField = note.content || '';
    if (!contentField.startsWith('storage://')) throw new Error('Note content is not a file');
    const path = contentField.replace(`storage://${this.BUCKET}/`, '');
    const { data: urlData, error: urlErr } = await this.supabase.storage
      .from(this.BUCKET)
      .createSignedUrl(path, 60);
    if (urlErr || !urlData?.signedUrl) throw urlErr || new Error('Failed to create signed URL');
    const resp = await fetch(urlData.signedUrl);
    if (!resp.ok) throw new Error(`Signed URL fetch failed: ${resp.status}`);
    const blob = await resp.blob();
    if ((note as any).is_encrypted && this.encryption.hasKey()) {
      try {
        return await this.encryption.decryptBlob(blob);
      } catch (e) {
        console.warn('Blob decryption failed; returning encrypted blob', e);
      }
    }
    return blob;
  }

  async getFileObjectUrl(noteId: string, userId: string): Promise<{ url: string; revoke: () => void }> {
    const blob = await this.getFileBlob(noteId, userId);
    const url = URL.createObjectURL(blob);
    return { url, revoke: () => URL.revokeObjectURL(url) };
  }

  /**
   * Fetch storage content for shared notes
   * This bypasses RLS by using signed URLs which work for public shares
   */
  async fetchStorageContent(storagePath: string): Promise<string> {
    try {
      // Parse storage path: storage://bucket/userId/noteId.md
      const path = storagePath.replace(`storage://${this.BUCKET}/`, '');
      
      // Create signed URL (works with anon key for public access)
      const { data: urlData, error: urlErr } = await this.supabase.storage
        .from(this.BUCKET)
        .createSignedUrl(path, 60);
      
      if (urlErr || !urlData?.signedUrl) {
        throw urlErr || new Error('Failed to create signed URL');
      }
      
      // Fetch content via signed URL
      const response = await fetch(urlData.signedUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch content: ${response.status} ${response.statusText}`);
      }
      
      const textContent = await response.text();
      
      // Try to decrypt if we have a key (owner viewing their own share)
      if (textContent && this.encryption.hasKey()) {
        try {
          return await this.encryption.decryptText(textContent);
        } catch (decryptErr) {
          // If decryption fails, return as-is (might not be encrypted)
          console.warn('Decryption failed, returning raw content:', decryptErr);
          return textContent;
        }
      }
      
      return textContent;
    } catch (err) {
      console.error('Error fetching storage content:', err);
      throw err;
    }
  }

  /**
   * Sync shared content when note is updated
   * Updates public_content in all shares for this note
   */
}
