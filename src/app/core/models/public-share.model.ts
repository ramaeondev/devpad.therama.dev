export interface PublicShare {
  id: string;
  note_id: string;
  user_id: string;
  share_token: string;
  permission: 'readonly' | 'editable';
  // NOTE: public_content removed - we now use note.content directly via RPC
  // This ensures single source of truth for all note content
  view_count: number;
  unique_view_count?: number;
  last_accessed_at?: string;
  created_at: string;
  updated_at: string;
  expires_at?: string;
  max_views?: number;
  note_title?: string; // Note title from the notes table
  // Content is fetched dynamically via get_shared_note RPC, not stored here
}

export interface CreateShareDto {
  note_id: string;
  permission: 'readonly' | 'editable';
  expires_at?: string;
}

export interface UpdateShareDto {
  permission?: 'readonly' | 'editable';
  expires_at?: string;
}
