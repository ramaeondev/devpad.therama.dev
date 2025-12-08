import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private supabase: SupabaseClient;
  private directClient: SupabaseClient | null = null;

  constructor() {
    // Check if we are in the OneDrive callback flow
    // OneDrive has its own OAuth token that's not a Supabase session
    // For GitHub and other Supabase OAuth providers, we NEED detectSessionInUrl enabled
    const isOneDriveCallback =
      typeof window !== 'undefined' &&
      window.location.pathname.includes('/auth/callback/onedrive');

    // Main client for API calls (uses proxy)
    this.supabase = createClient(environment.supabase.url, environment.supabase.anonKey, {
      auth: {
        storageKey: 'sb-auth-token',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: !isOneDriveCallback, // Only disable for OneDrive
        storage: window.localStorage,
      },
    });

    // Direct client for OAuth (bypasses proxy to use actual Supabase URL)
    if (environment.supabase.directUrl) {
      this.directClient = createClient(
        environment.supabase.directUrl,
        environment.supabase.anonKey,
        {
          auth: {
            storageKey: 'sb-auth-token',
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: !isOneDriveCallback,
            storage: window.localStorage,
          },
        }
      );
    }
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

  // OAuth auth methods should use direct client to bypass proxy
  get authDirect() {
    return this.directClient ? this.directClient.auth : this.supabase.auth;
  }

  get realtimeClient() {
    return this.directClient || this.supabase;
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