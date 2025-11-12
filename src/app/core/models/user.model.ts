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

export interface AuthResponse {
  user: User | null;
  error: Error | null;
}
