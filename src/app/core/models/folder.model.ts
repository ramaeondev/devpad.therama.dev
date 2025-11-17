export interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  user_id: string;
  is_root: boolean;
  created_at: string;
  updated_at: string;
  color?: string;
  icon?: string;
}

export interface CreateFolderDto {
  name: string;
  parent_id?: string | null;
  color?: string;
  icon?: string;
}

export interface UpdateFolderDto {
  name?: string;
  parent_id?: string | null;
  color?: string;
  icon?: string;
}

export interface FolderTree extends Folder {
  children?: FolderTree[];
  notes_count?: number;
  // Added for UI layering of notes inside tree (optional runtime property)
  notes?: { id: string; title: string; updated_at: string; folder_id: string | null; content?: string; icon?: string }[];
}
