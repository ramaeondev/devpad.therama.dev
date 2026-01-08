import { Injectable, signal, computed, inject } from '@angular/core';
import { User } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import { environment } from '../../../environments/environment';
import { EncryptionService } from './encryption.service';

@Injectable({
  providedIn: 'root',
})
export class AuthStateService {
  private currentUser = signal<User | null>(null);
  private loading = signal<boolean>(false);
  private encryptionReady = signal<boolean>(false);

  private encryption = inject(EncryptionService);
  private supabase = inject(SupabaseService);

  // Public readonly signals
  user = this.currentUser.asReadonly();
  isLoading = this.loading.asReadonly();
  isAuthenticated = computed(() => !!this.currentUser());
  userEmail = computed(() => this.currentUser()?.email ?? '');
  userId = computed(() => this.currentUser()?.id ?? '');
  hasEncryptionKey = this.encryptionReady.asReadonly();

  setUser(user: User | null) {
    this.currentUser.set(user);
    // Auto-load encryption key when user logs in
    if (user) {
      this.autoLoadEncryptionKey().catch((err) => {
        console.error('Failed to load encryption key:', err);
      });
    }
  }

  setLoading(loading: boolean) {
    this.loading.set(loading);
  }

  clear() {
    this.currentUser.set(null);
    this.loading.set(false);
    this.clearEncryption();
  }

  /**
   * Automatically derive and load encryption key from server
   * Called automatically on login - no user interaction required
   */
  private async autoLoadEncryptionKey(): Promise<void> {
    try {
      // Get current session
      const sessionResult = await this.supabase.getSession();

      if (!sessionResult.session?.access_token) {
        console.warn('No active session for encryption key derivation');
        this.encryptionReady.set(false);
        return;
      }

      // Call edge function to derive key
      const functionUrl = `${environment.supabase.url}/functions/v1/derive-encryption-key`;
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionResult.session.access_token}`,
          'Content-Type': 'application/json',
          apikey: environment.supabase.anonKey, // Add anon key for edge function
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Edge function error:', errorText);
        throw new Error(`Failed to derive encryption key: ${errorText}`);
      }

      const result = (await response.json()) as { key: string; version: string };
      await this.encryption.setKeyFromDerivedMaterial(result.key);
      this.encryptionReady.set(true);
      console.log('✅ Encryption key loaded successfully');
    } catch (error) {
      console.error('Error auto-loading encryption key:', error);
      // Don't throw - encryption is optional
      this.encryptionReady.set(false);
    }
  }

  clearEncryption() {
    this.encryption.clearKey();
    this.encryptionReady.set(false);
  }
}
