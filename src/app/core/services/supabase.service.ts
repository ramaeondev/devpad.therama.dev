import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    // Check if we are in the OneDrive callback flow
    // OneDrive has its own OAuth token that's not a Supabase session
    // For GitHub and other Supabase OAuth providers, we NEED detectSessionInUrl enabled
    const isOneDriveCallback =
      typeof window !== 'undefined' &&
      window.location.pathname.includes('/auth/callback/onedrive');

    // Validate config before creating the client so the error is actionable
    const supabaseUrl = environment?.supabase?.url;
    const supabaseAnonKey = environment?.supabase?.anonKey;
    if (!supabaseUrl || supabaseUrl.trim() === '') {
      throw new Error('SUPABASE_URL is required. Ensure environment or build-time injection is configured correctly.');
    }
    if (!supabaseAnonKey || supabaseAnonKey.trim() === '') {
      throw new Error('SUPABASE_ANON_KEY is required. Ensure environment or build-time injection is configured correctly.');
    }

    // Main client for API calls
    this.supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storageKey: 'sb-auth-token',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: !isOneDriveCallback, // Only disable for OneDrive
        storage: window.localStorage,
      },
    });
  }

  // Simple session getter - let Supabase handle caching
  async getSession() {
    const { data, error } = await this.supabase.auth.getSession();
    if (error) {
      console.error('Error getting session:', error);
      return { session: null, error };
    }
    return data;
  }

  get client() {
    return this.supabase;
  }

  get auth() {
    return this.supabase.auth;
  }

  // Unified auth getter
  get authDirect() {
    return this.supabase.auth;
  }

  get realtimeClient() {
    return this.supabase;
  }

  // IMPORTANT: Return the bound function, not a function that returns it
  from(table: string) {
    return this.supabase.from(table);
  }

  get storage() {
    return this.supabase.storage;
  }

  getSupabaseUrl(): string {
    return environment.supabase.url;
  }
}