export interface PublicShare {
  id: string;
  note_id: string;
  user_id: string;
  share_token: string;
  permission: 'readonly' | 'editable';
  public_content?: string;
  public_storage_path?: string;
  view_count: number;
  unique_view_count?: number; // Added
  last_accessed_at?: string;
  created_at: string;
  updated_at: string;
  expires_at?: string;
  max_views?: number;
  note_title?: string; // Note title from the notes table
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
