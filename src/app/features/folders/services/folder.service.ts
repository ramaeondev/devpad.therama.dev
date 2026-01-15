import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';
import { UserService } from '../../../core/services/user.service';
import {
  Folder,
  CreateFolderDto,
  UpdateFolderDto,
  FolderTree,
} from '../../../core/models/folder.model';
import { LoadingService } from '../../../core/services/loading.service';
import { ActivityLogService } from '../../../core/services/activity-log.service';
import { ActivityAction, ActivityResource } from '../../../core/models/activity-log.model';

@Injectable({
  providedIn: 'root',
})
export class FolderService {
  private supabase = inject(SupabaseService);
  private userService = inject(UserService);
  private loading = inject(LoadingService);
  private activityLog = inject(ActivityLogService);

  /**
   * Create the root folder for a user (first-time setup)
   */
  async createRootFolder(userId: string): Promise<Folder> {
    return this.loading.withLoading(async () => {
      try {
        // Check if root folder already exists
        const hasRootFolder = await this.userService.hasRootFolder(userId);
        if (hasRootFolder) {
          const existingRoot = await this.getRootFolder(userId);
          if (!existingRoot) {
            throw new Error('Root folder flag set but folder not found');
          }
          return existingRoot;
        }

        // Create root folder
        const { data, error } = await this.supabase
          .from('folders')
          .insert({
            name: 'My Notes',
            user_id: userId,
            parent_id: null,
            is_root: true,
            icon: 'fa-folder-open',
          })
          .select()
          .single();

        if (error) throw error;

        // Mark root folder as created in user profile
        await this.userService.markRootFolderCreated(userId);

        return data as Folder;
      } catch (error) {
        console.error('Error creating root folder:', error);
        throw error;
      }
    });
  }

  /**
   * Get root folder for a user
   * Fixed: Using maybeSingle() to avoid 406 errors
   */
  async getRootFolder(userId: string): Promise<Folder | null> {
    return this.loading.withLoading(async () => {
      try {
        const { data, error } = await this.supabase
          .from('folders')
          .select('*')
          .eq('user_id', userId)
          .eq('is_root', true)
          .maybeSingle(); // FIXED: Use maybeSingle() instead of single()

        if (error) throw error;

        return data as Folder | null;
      } catch (error) {
        console.error('Error fetching root folder:', error);
        return null;
      }
    });
  }

  /**
   * Initialize folders for first-time user
   */
  async initializeUserFolders(userId: string): Promise<Folder> {
    return this.loading.withLoading(async () => {
      try {
        // Check if user already has a root folder
        const rootFolder = await this.getRootFolder(userId);

        if (rootFolder) {
          return rootFolder;
        }

        // Create root folder if it doesn't exist
        return await this.createRootFolder(userId);
      } catch (error) {
        console.error('Error initializing user folders:', error);
        throw error;
      }
    });
  }

  /**
   * Create a new folder
   */
  async createFolder(userId: string, dto: CreateFolderDto): Promise<Folder> {
    return this.loading.withLoading(async () => {
      try {
        // Duplicate name guard within same parent (case-sensitive equality)
        let dupQuery = this.supabase
          .from('folders')
          .select('id')
          .eq('user_id', userId)
          .eq('name', dto.name.trim());
        if (dto.parent_id == null) {
          // need IS NULL instead of eq for null
          dupQuery = dupQuery.is('parent_id', null) as any;
        } else {
          dupQuery = dupQuery.eq('parent_id', dto.parent_id);
        }
        const { data: dupCheck, error: dupError } = await dupQuery;
        if (dupError) {
          console.warn('Duplicate check error (continuing):', dupError);
        } else if (dupCheck && dupCheck.length > 0) {
          throw new Error('A folder with this name already exists here');
        }

        const { data, error } = await this.supabase
          .from('folders')
          .insert({
            name: dto.name,
            user_id: userId,
            parent_id: dto.parent_id ?? null,
            is_root: false,
            color: dto.color,
            icon: dto.icon,
          })
          .select()
          .single();

        if (error) throw error;

        // Log activity
        await this.activityLog.logActivity(userId, {
          action_type: ActivityAction.Create,
          resource_type: ActivityResource.Folder,
          resource_id: data.id,
          resource_name: dto.name,
        });

        return data as Folder;
      } catch (error) {
        console.error('Error creating folder:', error);
        throw error;
      }
    });
  }

  /**
   * Get all folders for a user
   */
  async getFolders(userId: string): Promise<Folder[]> {
    return this.loading.withLoading(async () => {
      try {
        const { data, error } = await this.supabase
          .from('folders')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: true });

        if (error) throw error;

        return (data as Folder[]) || [];
      } catch (error) {
        console.error('Error fetching folders:', error);
        return [];
      }
    });
  }

  /**
   * Get folder tree structure
   */
  async getFolderTree(userId: string): Promise<FolderTree[]> {
    try {
      const folders = await this.getFolders(userId);
      return this.buildFolderTree(folders);
    } catch (error) {
      console.error('Error building folder tree:', error);
      return [];
    }
  }

  /**
   * Build hierarchical folder tree
   */
  private buildFolderTree(folders: Folder[], parentId: string | null = null): FolderTree[] {
    return folders
      .filter((folder) => folder.parent_id === parentId)
      .map((folder) => ({
        ...folder,
        children: this.buildFolderTree(folders, folder.id),
      }));
  }

  /**
   * Get a single folder by ID
   */
  async getFolder(folderId: string, userId: string): Promise<Folder | null> {
    return this.loading.withLoading(async () => {
      try {
        const { data, error } = await this.supabase
          .from('folders')
          .select('*')
          .eq('id', folderId)
          .eq('user_id', userId)
          .maybeSingle(); // FIXED: Use maybeSingle() instead of single()

        if (error) throw error;

        return data as Folder | null;
      } catch (error) {
        console.error('Error fetching folder:', error);
        return null;
      }
    });
  }

  /**
   * Update a folder
   */
  async updateFolder(folderId: string, userId: string, dto: UpdateFolderDto): Promise<Folder> {
    return this.loading.withLoading(async () => {
      try {
        const { data, error } = await this.supabase
          .from('folders')
          .update({
            name: dto.name,
            parent_id: dto.parent_id,
            color: dto.color,
            icon: dto.icon,
            updated_at: new Date().toISOString(),
          })
          .eq('id', folderId)
          .eq('user_id', userId)
          .select()
          .single();

        if (error) throw error;

        // Log activity
        await this.activityLog.logActivity(userId, {
          action_type: ActivityAction.Update,
          resource_type: ActivityResource.Folder,
          resource_id: folderId,
          resource_name: dto.name || data.name,
        });

        return data as Folder;
      } catch (error) {
        console.error('Error updating folder:', error);
        throw error;
      }
    });
  }

  /**
   * Delete a folder
   */
  async deleteFolder(folderId: string, userId: string): Promise<void> {
    return this.loading.withLoading(async () => {
      try {
        // Prevent deleting root folder
        const folder = await this.getFolder(folderId, userId);
        if (folder?.is_root) {
          throw new Error('Cannot delete root folder');
        }

        const { error } = await this.supabase
          .from('folders')
          .delete()
          .eq('id', folderId)
          .eq('user_id', userId);

        if (error) throw error;

        // Log activity
        await this.activityLog.logActivity(userId, {
          action_type: ActivityAction.Delete,
          resource_type: ActivityResource.Folder,
          resource_id: folderId,
          resource_name: folder?.name || 'Untitled',
        });
      } catch (error) {
        console.error('Error deleting folder:', error);
        throw error;
      }
    });
  }

  /**
   * Get child folders
   */
  async getChildFolders(parentId: string, userId: string): Promise<Folder[]> {
    return this.loading.withLoading(async () => {
      try {
        const { data, error } = await this.supabase
          .from('folders')
          .select('*')
          .eq('user_id', userId)
          .eq('parent_id', parentId)
          .order('name', { ascending: true });

        if (error) throw error;

        return (data as Folder[]) || [];
      } catch (error) {
        console.error('Error fetching child folders:', error);
        return [];
      }
    });
  }
}
