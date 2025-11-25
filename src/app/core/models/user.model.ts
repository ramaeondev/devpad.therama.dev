export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
  user_metadata?: {
    name?: string;
    avatar_url?: string;
  };
}

export interface UserProfile {
  id: string;
  user_id: string;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
  is_root_folder_created: boolean;
  disabled?: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  user: User | null;
  error: Error | null;
}
