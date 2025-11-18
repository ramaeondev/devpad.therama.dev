import { Injectable, inject } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from './config.service';

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private _supabase: SupabaseClient | null = null;
  private sessionCache: any = null;
  private sessionPromise: Promise<any> | null = null;
  private configService = inject(ConfigService);

  constructor() {
    // No client initialization here to avoid circular dependency
  }

  private get supabase(): SupabaseClient {
    if (this._supabase) {
      return this._supabase;
    }

    const config = this.configService.config();
    if (!config) {
      throw new Error('Configuration not loaded! Cannot initialize Supabase client.');
    }

    this._supabase = createClient(config.supabase.url, config.supabase.anonKey, {
      auth: {
        storageKey: 'sb-auth-token',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });

    return this._supabase;
  }

  // Cached session getter to prevent lock conflicts
  async getSession() {
    // Return cached session if available and fresh (< 5 seconds old)
    if (this.sessionCache && Date.now() - this.sessionCache.timestamp < 5000) {
      return this.sessionCache.data;
    }

    // If a session fetch is already in progress, wait for it
    if (this.sessionPromise) {
      return this.sessionPromise;
    }

    // Fetch session with retry logic
    this.sessionPromise = this.fetchSessionWithRetry();
    const result = await this.sessionPromise;
    this.sessionPromise = null;

    // Cache the result
    this.sessionCache = {
      data: result,
      timestamp: Date.now(),
    };

    return result;
  }

  private async fetchSessionWithRetry(retries = 3): Promise<any> {
    for (let i = 0; i < retries; i++) {
      try {
        const { data, error } = await this.supabase.auth.getSession();
        if (error) throw error;
        return data;
      } catch (error: any) {
        if (error?.message?.includes('lock') && i < retries - 1) {
          // Wait and retry on lock timeout
          await new Promise((resolve) => setTimeout(resolve, 200 * (i + 1)));
          continue;
        }
        throw error;
      }
    }
  }

  get client() {
    return this.supabase;
  }

  get auth() {
    return this.supabase.auth;
  }

  get from() {
    return this.supabase.from.bind(this.supabase);
  }

  get storage() {
    return this.supabase.storage;
  }
}
