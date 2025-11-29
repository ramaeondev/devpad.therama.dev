import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(environment.supabase.url, environment.supabase.anonKey, {
      auth: {
        storageKey: 'sb-auth-token',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        // Add this to prevent lock issues
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

  // IMPORTANT: Return the bound function, not a function that returns it
  from(table: string) {
    return this.supabase.from(table);
  }

  get storage() {
    return this.supabase.storage;
  }
}