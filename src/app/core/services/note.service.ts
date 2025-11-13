import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { CreateNoteDto, Note, UpdateNoteDto } from '../models/note.model';
import { LoadingService } from './loading.service';

@Injectable({ providedIn: 'root' })
export class NoteService {
  private supabase = inject(SupabaseService);
  private loading = inject(LoadingService);

  async createNote(userId: string, dto: CreateNoteDto): Promise<Note> {
    return this.loading.withLoading(async () => {
      const { data, error } = await this.supabase
      .from('notes')
      .insert({
        title: dto.title,
        content: dto.content,
        folder_id: dto.folder_id ?? null,
        user_id: userId,
        tags: dto.tags ?? []
      })
      .select()
      .single();
      if (error) throw error;
      return data as Note;
    });
  }

  async updateNote(noteId: string, userId: string, dto: UpdateNoteDto): Promise<Note> {
    return this.loading.withLoading(async () => {
      const { data, error } = await this.supabase
      .from('notes')
      .update({
        title: dto.title,
        content: dto.content,
        folder_id: dto.folder_id,
        tags: dto.tags,
        is_favorite: dto.is_favorite,
        is_archived: dto.is_archived,
        updated_at: new Date().toISOString()
      })
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
      return data as Note;
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
