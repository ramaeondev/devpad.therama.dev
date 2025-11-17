import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { UserProfile } from '../models/user.model';
import { LoadingService } from './loading.service';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private supabase = inject(SupabaseService);
  private loading = inject(LoadingService);

  /**
   * Get user profile by user ID
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    return this.loading.withLoading(async () => {
      try {
        const { data, error } = await this.supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (error) {
          // If profile doesn't exist, create one
          if (error.code === 'PGRST116') {
            return await this.createUserProfile(userId);
          }
          throw error;
        }

        return data as UserProfile;
      } catch (error) {
        console.error('Error fetching user profile:', error);
        throw error;
      }
    });
  }

  /**
   * Create a new user profile
   */
  async createUserProfile(userId: string, init?: Partial<UserProfile>): Promise<UserProfile> {
    return this.loading.withLoading(async () => {
      try {
        const { data, error } = await this.supabase
          .from('user_profiles')
          .insert({
            user_id: userId,
            is_root_folder_created: false,
            first_name: init?.first_name ?? null,
            last_name: init?.last_name ?? null,
            avatar_url: init?.avatar_url ?? null,
          })
          .select()
          .single();

        if (error) throw error;

        return data as UserProfile;
      } catch (error) {
        console.error('Error creating user profile:', error);
        throw error;
      }
    });
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    return this.loading.withLoading(async () => {
      try {
        const { data, error } = await this.supabase
          .from('user_profiles')
          .update(updates)
          .eq('user_id', userId)
          .select()
          .single();

        if (error) throw error;

        return data as UserProfile;
      } catch (error) {
        console.error('Error updating user profile:', error);
        throw error;
      }
    });
  }

  /**
   * Mark root folder as created for user
   */
  async markRootFolderCreated(userId: string): Promise<void> {
    try {
      await this.updateUserProfile(userId, {
        is_root_folder_created: true,
      });
    } catch (error) {
      console.error('Error marking root folder as created:', error);
      throw error;
    }
  }

  /**
   * Check if root folder has been created for user
   */
  async hasRootFolder(userId: string): Promise<boolean> {
    try {
      const profile = await this.getUserProfile(userId);
      return profile?.is_root_folder_created ?? false;
    } catch (error) {
      console.error('Error checking root folder status:', error);
      return false;
    }
  }

  /** Upload avatar to storage and return public URL */
  async uploadAvatar(userId: string, file: File): Promise<string> {
    return this.loading.withLoading(async () => {
      // Always use .png extension and consistent naming: avatars/<user_id>.png
      const path = `avatars/${userId}.png`;

      // Upload with upsert:true to replace existing avatar
      const { error: upErr } = await this.supabase.storage.from('avatars').upload(path, file, {
        upsert: true,
        cacheControl: '3600',
        contentType: 'image/png',
      });

      if (upErr) throw upErr;

      // Add timestamp to URL to bust cache after upload
      const { data } = this.supabase.storage.from('avatars').getPublicUrl(path);
      return `${data.publicUrl}?t=${Date.now()}`;
    });
  }
}
