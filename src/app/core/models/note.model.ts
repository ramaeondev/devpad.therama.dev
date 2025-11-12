export interface Note {
  id: string;
  title: string;
  content: string;
  folder_id: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
  tags?: string[];
  is_favorite?: boolean;
  is_archived?: boolean;
}

export interface CreateNoteDto {
  title: string;
  content: string;
  folder_id?: string | null;
  tags?: string[];
}

export interface UpdateNoteDto {
  title?: string;
  content?: string;
  folder_id?: string | null;
  tags?: string[];
  is_favorite?: boolean;
  is_archived?: boolean;
}
