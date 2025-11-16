import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { CreateNoteDto, Note, UpdateNoteDto } from '../models/note.model';
import { LoadingService } from './loading.service';

@Injectable({ providedIn: 'root' })
export class NoteService {
  private supabase = inject(SupabaseService);
  private loading = inject(LoadingService);
  private readonly BUCKET = 'notes';

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
          tags: dto.tags ?? []
        })
        .select()
        .single();
      if (createErr) throw createErr;

      const note = created as Note;
      // Step 2: upload content to storage (even if empty, create the file for consistency)
      // Use a deterministic path for each note and upload using File for browser compatibility
      const path = `${userId}/${note.id}.md`;
      const contentStr = typeof dto.content === 'string' ? dto.content : (dto.content ?? '');
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
      const { data: updated, error: updateErr } = await this.supabase
        .from('notes')
        .update({ content: storageRef, updated_at: new Date().toISOString() })
        .eq('id', note.id)
        .eq('user_id', userId)
        .select()
        .single();
      if (updateErr) throw updateErr;
      return updated as Note;
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

      if (!cur.content || !cur.content.startsWith('storage://')) {
        // Previous rows stored raw content in DB; migrate that content (or dto.content if provided)
        const migrateContent = dto.content !== undefined ? dto.content : (cur.content || '');
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
      } else {
        // File already stored in storage; if new content provided, overwrite the deterministic path
        if (dto.content !== undefined) {
          const file = new File([dto.content], `${noteId}.md`, { type: 'text/markdown' });
          const { error: upErr } = await this.supabase.storage
            .from(this.BUCKET)
            .upload(expectedPath, file, { upsert: true, contentType: 'text/markdown' });
          if (upErr) throw upErr;
          // Only verify when provided content is non-empty
          if (dto.content && (dto.content as string).length > 0) {
            await this.verifyUpload(expectedPath);
          }
          storageRef = `storage://${this.BUCKET}/${expectedPath}`;
        } else {
          // keep existing storageRef if no content provided
          storageRef = cur.content;
        }
      }

      const updatePayload: any = {
        updated_at: new Date().toISOString()
      };
      
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
      return data as Note;
    });
  }

  async deleteNote(noteId: string, userId: string): Promise<void> {
    return this.loading.withLoading(async () => {
      const { error } = await this.supabase
      .from('notes')
      .delete()
      .eq('id', noteId)
      .eq('user_id', userId);
      if (error) throw error;
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
        // Parse storage path and fetch content via signed URL (always use signed URLs for private buckets)
        const path = contentField.replace(`storage://${this.BUCKET}/`, '');
        const { data: urlData, error: urlErr } = await this.supabase.storage
          .from(this.BUCKET)
          .createSignedUrl(path, 60);
        if (urlErr || !urlData?.signedUrl) {
          throw urlErr || new Error('Signed URL could not be created');
        }
        const resp = await fetch(urlData.signedUrl);
        if (!resp.ok) throw new Error(`Signed URL fetch failed: ${resp.status}`);
        const signedText = await resp.text();
        return { ...(note as Note), content: signedText } as Note;
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
      return (data as Note[]) || [];
    });
  }
}
