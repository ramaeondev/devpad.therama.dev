import { Injectable, inject } from '@angular/core';
import CryptoJS from 'crypto-js';
import { HttpClient } from '@angular/common/http';
import { SupabaseService } from './supabase.service';
import { CreateNoteDto, Note, UpdateNoteDto } from '../models/note.model';
import { LoadingService } from './loading.service';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class NoteService {
  private http = inject(HttpClient);

  /**
   * Generate a random AES key (256-bit)
   */
  private generateSymmetricKey(): string {
    const key = CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex);
    console.log('Generated Symmetric Key:', key);
    console.log('Key Length:', key.length);
    return key;
  }

  /**
   * Encrypt note content using AES
   */
  private encryptContent(content: string, key: string): string {
    return CryptoJS.AES.encrypt(content, key).toString();
  }

  /**
   * Decrypt note content using AES
   */
  private decryptContent(encrypted: string, key: string): string {
    const bytes = CryptoJS.AES.decrypt(encrypted, key);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  /**
   * Encrypt symmetric key using Supabase Edge Function
   */
  async encryptSymmetricKeyWithSupabase(key: string): Promise<string> {
    // Use Supabase URL from imported environment config
    const endpoint = `${environment.supabase.url}/functions/v1/encrypt-key`;
    const response = await this.http.post<{ encryptedKey: string, debug?: any }>(
      endpoint,
      { key }
    ).toPromise();

    console.log('Full encrypt-key response:', response);
    console.log('encryptedKey from response:', response?.encryptedKey);
    console.log('encryptedKey length from response:', response?.encryptedKey?.length);

    return response?.encryptedKey ?? '';
  }

  /**
   * Decrypt symmetric key using Supabase Edge Function
   */
  async decryptSymmetricKeyWithSupabase(encryptedKey: string): Promise<string> {
    // Use Supabase URL from imported environment config
    const endpoint = `${environment.supabase.url}/functions/v1/decrypt-key`;
    const response = await this.http.post<{ key: string }>(
      endpoint,
      { encryptedKey }
    ).toPromise();
    return response?.key ?? '';
  }
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
          tags: dto.tags ?? [],
        })
        .select()
        .single();
      if (createErr) throw createErr;

      const note = created as Note;
      // Step 2: generate symmetric key and encrypt content
      const symmetricKey = this.generateSymmetricKey();
      const encryptedContent = this.encryptContent(dto.content ?? '', symmetricKey);
      // Encrypt symmetric key using Supabase Edge Function
      const encryptedKey = await this.encryptSymmetricKeyWithSupabase(symmetricKey);

      // Step 3: upload encrypted content to storage
      const path = `${userId}/${note.id}.md`;
      const file = new File([encryptedContent], `${note.id}.md`, { type: 'text/markdown' });
      const { error: uploadErr } = await this.supabase.storage
        .from(this.BUCKET)
        .upload(path, file, { upsert: true, contentType: 'text/markdown' });
      if (uploadErr) throw uploadErr;
      if (encryptedContent && encryptedContent.length > 0) {
        await this.verifyUpload(path);
      }

      // Step 4: update row to reference storage path and encrypted key
      const storageRef = `storage://${this.BUCKET}/${path}`;
      console.log('Encrypted Key before save:', encryptedKey);
      console.log('Encrypted Key length:', encryptedKey.length);

      const { data: updated, error: updateErr } = await this.supabase
        .from('notes')
        .update({ content: storageRef, encrypted_key: encryptedKey, updated_at: new Date().toISOString() })
        .eq('id', note.id)
        .eq('user_id', userId)
        .select()
        .single();
      if (updateErr) throw updateErr;

      console.log('Encrypted Key after save:', (updated as any).encrypted_key);
      console.log('Encrypted Key length after save:', (updated as any).encrypted_key?.length);

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
      const cur = current as Note & { content?: string, encrypted_key?: string };

      // Always target a deterministic path for the note file
      const expectedPath = `${userId}/${noteId}.md`;
      let storageRef = `storage://${this.BUCKET}/${expectedPath}`;

      let encryptedKey = cur.encrypted_key;
      let symmetricKey = '';

      // If updating content, generate new symmetric key and encrypted key
      if (dto.content !== undefined) {
        symmetricKey = this.generateSymmetricKey();
        encryptedKey = await this.encryptSymmetricKeyWithSupabase(symmetricKey);
        const encryptedContent = this.encryptContent(dto.content as string, symmetricKey);
        const file = new File([encryptedContent], `${noteId}.md`, { type: 'text/markdown' });
        const { error: upErr } = await this.supabase.storage
          .from(this.BUCKET)
          .upload(expectedPath, file, { upsert: true, contentType: 'text/markdown' });
        if (upErr) throw upErr;
        if (encryptedContent && encryptedContent.length > 0) {
          await this.verifyUpload(expectedPath);
        }
        storageRef = `storage://${this.BUCKET}/${expectedPath}`;
      } else {
        storageRef = cur.content;
      }

      const updatePayload: any = {
        updated_at: new Date().toISOString(),
      };
      if (dto.title !== undefined) updatePayload.title = dto.title;
      if (dto.content !== undefined) updatePayload.content = storageRef;
      if (encryptedKey) updatePayload.encrypted_key = encryptedKey;
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
      const note = data as Note & { content?: string, encrypted_key?: string };
      const contentField = note.content || '';
      if (contentField.startsWith('storage://')) {
        const path = contentField.replace(`storage://${this.BUCKET}/`, '');
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
          const encryptedContent = await resp.text();
          // Decrypt symmetric key using Supabase Edge Function
          let symmetricKey = '';
          if (note.encrypted_key) {
            symmetricKey = await this.decryptSymmetricKeyWithSupabase(note.encrypted_key);
          }
          let decrypted = encryptedContent;
          if (symmetricKey) {
            try {
              decrypted = this.decryptContent(encryptedContent, symmetricKey);
            } catch (e) {
              decrypted = encryptedContent;
            }
          }
          return { ...(note as Note), content: decrypted } as Note;
        }
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

      // Step 2: upload file to storage
      const path = `${userId}/${note.id}.${ext}`;
      const { error: uploadErr } = await this.supabase.storage
        .from(this.BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type || 'application/octet-stream' });
      if (uploadErr) throw uploadErr;

      // Verify upload
      await this.verifyUpload(path);

      // Step 3: update note with storage ref
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
}
