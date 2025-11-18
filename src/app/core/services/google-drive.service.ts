import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthStateService } from './auth-state.service';
import { ToastService } from './toast.service';
import { LoadingService } from './loading.service';
import { Integration, GoogleDriveFile, GoogleDriveFolder } from '../models/integration.model';
import { ConfigService } from './config.service';

declare const google: any;

@Injectable({ providedIn: 'root' })
export class GoogleDriveService {
  private supabase = inject(SupabaseService);
  private auth = inject(AuthStateService);
  private toast = inject(ToastService);
  private loading = inject(LoadingService);
  private configService = inject(ConfigService);

  // State
  isConnected = signal(false);
  integration = signal<Integration | null>(null);
  files = signal<GoogleDriveFile[]>([]);
  rootFolder = signal<GoogleDriveFolder | null>(null);

  private readonly SCOPES = [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
  ].join(' ');

  private tokenRefreshTimer?: number;

  constructor() {
    if (!this.configService.config()) {
      throw new Error('Configuration not loaded! Cannot initialize GoogleDriveService.');
    }
  }

  /**
   * Initialize Google Drive OAuth
   */
  async initGoogleAuth(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof google === 'undefined') {
        // Load Google Identity Services script
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
        document.head.appendChild(script);
      } else {
        resolve();
      }
    });
  }

  /**
   * Connect Google Drive
   */
  async connect(): Promise<void> {
    try {
      await this.initGoogleAuth();
      const config = this.configService.config();
      if (!config) {
        throw new Error('Configuration not loaded!');
      }

      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: config.google.clientId,
        scope: this.SCOPES,
        callback: async (response: any) => {
          if (response.error) {
            this.toast.error('Failed to connect Google Drive');
            return;
          }

          await this.handleAuthSuccess(response.access_token, response.expires_in);
        },
      });

      tokenClient.requestAccessToken();
    } catch (error: any) {
      console.error('Google Drive connection error:', error);
      this.toast.error('Failed to connect Google Drive');
    }
  }

  /**
   * Handle successful OAuth
   */
  private async handleAuthSuccess(accessToken: string, expiresIn?: number): Promise<void> {
    try {
      this.loading.start();

      // Get user info
      const userInfo = await this.getUserInfo(accessToken);

      // Calculate expiration time (default to 3600 seconds if not provided)
      const expiresInMs = (expiresIn || 3600) * 1000;
      const expiresAt = Date.now() + expiresInMs;

      // Save integration to database
      const userId = this.auth.userId();
      const { data, error } = await this.supabase
        .from('integrations')
        .upsert(
          {
            user_id: userId,
            provider: 'google_drive',
            access_token: accessToken,
            expires_at: expiresAt,
            email: userInfo.email,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,provider',
          }
        )
        .select()
        .single();

      if (error) throw error;

      this.integration.set(data as Integration);
      this.isConnected.set(true);
      this.toast.success('Google Drive connected successfully');

      // Schedule token refresh (refresh 5 minutes before expiration)
      this.scheduleTokenRefresh(expiresInMs - 5 * 60 * 1000);

      // Load files
      await this.loadFiles();
    } catch (error: any) {
      console.error('Failed to save integration:', error);
      this.toast.error('Failed to save Google Drive connection');
    } finally {
      this.loading.stop();
    }
  }

  /**
   * Get user info from Google
   */
  private async getUserInfo(accessToken: string): Promise<{ email: string }> {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get user info: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('getUserInfo error:', error);
      throw error;
    }
  }

  /**
   * Check existing connection
   */
  async checkConnection(): Promise<void> {
    try {
      const userId = this.auth.userId();
      const { data, error } = await this.supabase
        .from('integrations')
        .select('*')
        .eq('user_id', userId)
        .eq('provider', 'google_drive')
        .single();

      if (!error && data) {
        const integration = data as Integration;
        
        // Check if token is expired or will expire soon (within 5 minutes)
        if (integration.expires_at) {
          const expiresAt = typeof integration.expires_at === 'string' 
            ? parseInt(integration.expires_at) 
            : integration.expires_at;
          const timeUntilExpiry = expiresAt - Date.now();
          
          if (timeUntilExpiry <= 5 * 60 * 1000) {
            // Token expired or expiring soon, need to refresh
            await this.refreshToken();
            return;
          }
          
          // Schedule refresh for later
          this.scheduleTokenRefresh(timeUntilExpiry - 5 * 60 * 1000);
        }
        
        this.integration.set(integration);
        this.isConnected.set(true);
        await this.loadFiles();
      }
    } catch (error) {
      console.error('Failed to check Google Drive connection:', error);
    }
  }

  /**
   * Disconnect Google Drive
   */
  async disconnect(): Promise<void> {
    try {
      this.loading.start();
      
      // Clear token refresh timer
      if (this.tokenRefreshTimer) {
        window.clearTimeout(this.tokenRefreshTimer);
        this.tokenRefreshTimer = undefined;
      }
      
      const userId = this.auth.userId();

      const { error } = await this.supabase
        .from('integrations')
        .delete()
        .eq('user_id', userId)
        .eq('provider', 'google_drive');

      if (error) throw error;

      this.integration.set(null);
      this.isConnected.set(false);
      this.files.set([]);
      this.rootFolder.set(null);
      this.toast.success('Google Drive disconnected');
    } catch (error: any) {
      console.error('Failed to disconnect:', error);
      this.toast.error('Failed to disconnect Google Drive');
    } finally {
      this.loading.stop();
    }
  }

  /**
   * Load files from Google Drive
   */
  async loadFiles(): Promise<void> {
    try {
      const accessToken = this.integration()?.access_token;
      if (!accessToken) return;

      const params = new URLSearchParams({
        pageSize: '100',
        fields: 'files(id,name,mimeType,modifiedTime,size,webViewLink,iconLink,parents)',
        q: 'trashed=false',
      });

      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?${params}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Drive API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const files: GoogleDriveFile[] = data.files.map((file: any) => ({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        modifiedTime: file.modifiedTime,
        size: file.size,
        webViewLink: file.webViewLink,
        iconLink: file.iconLink,
        parents: file.parents,
        isFolder: file.mimeType === 'application/vnd.google-apps.folder',
      }));

      this.files.set(files);
      this.buildFolderTree(files);
    } catch (error: any) {
      console.error('Failed to load files:', error);
      this.toast.error('Failed to load Google Drive files');
    }
  }

  /**
   * Build folder tree structure
   */
  private buildFolderTree(files: GoogleDriveFile[]): void {
    const folders = files.filter((f) => f.isFolder);
    const regularFiles = files.filter((f) => !f.isFolder);

    const root: GoogleDriveFolder = {
      id: 'root',
      name: 'Google Drive',
      files: regularFiles.filter((f) => !f.parents || f.parents.length === 0),
      folders: [],
    };

    const folderMap = new Map<string, GoogleDriveFolder>();
    folderMap.set('root', root);

    // Create folder nodes
    folders.forEach((folder) => {
      folderMap.set(folder.id, {
        id: folder.id,
        name: folder.name,
        files: [],
        folders: [],
      });
    });

    // Build tree structure
    folders.forEach((folder) => {
      const node = folderMap.get(folder.id)!;
      const parentId = folder.parents?.[0] || 'root';
      const parent = folderMap.get(parentId) || root;
      parent.folders.push(node);

      // Add files to this folder
      node.files = regularFiles.filter((f) => f.parents?.[0] === folder.id);
    });

    this.rootFolder.set(root);
  }

  /**
   * Upload file to Google Drive
   */
  async uploadFile(file: File, folderId?: string): Promise<GoogleDriveFile | null> {
    try {
      this.loading.start();
      const accessToken = this.integration()?.access_token;
      if (!accessToken) {
        this.toast.error('Not connected to Google Drive');
        return null;
      }

      const metadata = {
        name: file.name,
        mimeType: file.type,
        ...(folderId && { parents: [folderId] }),
      };

      const formData = new FormData();
      formData.append(
        'metadata',
        new Blob([JSON.stringify(metadata)], { type: 'application/json' })
      );
      formData.append('file', file);

      const response = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,modifiedTime,size,webViewLink,iconLink,parents',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const uploadedFile: GoogleDriveFile = {
        id: data.id,
        name: data.name,
        mimeType: data.mimeType,
        modifiedTime: data.modifiedTime,
        size: data.size,
        webViewLink: data.webViewLink,
        iconLink: data.iconLink,
        parents: data.parents,
        isFolder: false,
      };

      this.toast.success('File uploaded to Google Drive');
      await this.loadFiles(); // Refresh file list
      return uploadedFile;
    } catch (error: any) {
      console.error('Failed to upload file:', error);
      this.toast.error('Failed to upload file to Google Drive');
      return null;
    } finally {
      this.loading.stop();
    }
  }

  /**
   * Download file from Google Drive
   */
  async downloadFile(fileId: string, mimeType?: string): Promise<Blob | null> {
    try {
      this.loading.start();
      const accessToken = this.integration()?.access_token;
      if (!accessToken) {
        this.toast.error('Not connected to Google Drive');
        return null;
      }

      // Check if it's a Google Workspace file that needs to be exported
      const exportMapping: Record<string, string> = {
        'application/vnd.google-apps.document': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'application/vnd.google-apps.spreadsheet': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.google-apps.presentation': 'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
        'application/vnd.google-apps.drawing': 'image/png',
        'application/vnd.google-apps.script': 'application/vnd.google-apps.script+json',
      };

      let url: string;
      if (mimeType && exportMapping[mimeType]) {
        // Use export endpoint for Google Workspace files
        url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=${encodeURIComponent(exportMapping[mimeType])}`;
      } else {
        // Use regular download for binary files
        url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Download failed: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
      }

      return await response.blob();
    } catch (error: any) {
      console.error('Failed to download file:', error);
      this.toast.error('Failed to download file from Google Drive');
      return null;
    } finally {
      this.loading.stop();
    }
  }

  /**
   * Delete file from Google Drive
   */
  async deleteFile(fileId: string): Promise<boolean> {
    try {
      this.loading.start();
      const accessToken = this.integration()?.access_token;
      if (!accessToken) {
        this.toast.error('Not connected to Google Drive');
        return false;
      }

      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Delete failed: ${response.status} ${response.statusText}`);
      }

      this.toast.success('File deleted from Google Drive');
      await this.loadFiles(); // Refresh file list
      return true;
    } catch (error: any) {
      console.error('Failed to delete file:', error);
      this.toast.error('Failed to delete file from Google Drive');
      return false;
    } finally {
      this.loading.stop();
    }
  }

  /**
   * Create folder in Google Drive
   */
  async createFolder(name: string, parentId?: string): Promise<GoogleDriveFile | null> {
    try {
      this.loading.start();
      const accessToken = this.integration()?.access_token;
      if (!accessToken) {
        this.toast.error('Not connected to Google Drive');
        return null;
      }

      const metadata = {
        name,
        mimeType: 'application/vnd.google-apps.folder',
        ...(parentId && { parents: [parentId] }),
      };

      const response = await fetch(
        'https://www.googleapis.com/drive/v3/files',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(metadata),
        }
      );

      if (!response.ok) {
        throw new Error(`Create folder failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const folder: GoogleDriveFile = {
        id: data.id,
        name: data.name,
        mimeType: data.mimeType,
        modifiedTime: data.modifiedTime,
        parents: data.parents,
        isFolder: true,
      };

      this.toast.success('Folder created in Google Drive');
      await this.loadFiles(); // Refresh file list
      return folder;
    } catch (error: any) {
      console.error('Failed to create folder:', error);
      this.toast.error('Failed to create folder in Google Drive');
      return null;
    } finally {
      this.loading.stop();
    }
  }

  /**
   * Rename file or folder in Google Drive
   */
  async renameFile(fileId: string, newName: string): Promise<boolean> {
    try {
      this.loading.start();
      const accessToken = this.integration()?.access_token;
      if (!accessToken) {
        this.toast.error('Not connected to Google Drive');
        return false;
      }

      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: newName }),
        }
      );

      if (!response.ok) {
        throw new Error(`Rename failed: ${response.status} ${response.statusText}`);
      }

      this.toast.success('File renamed successfully');
      await this.loadFiles(); // Refresh file list
      return true;
    } catch (error: any) {
      console.error('Failed to rename file:', error);
      this.toast.error('Failed to rename file');
      return false;
    } finally {
      this.loading.stop();
    }
  }

  /**
   * Schedule token refresh
   */
  private scheduleTokenRefresh(delayMs: number): void {
    // Clear existing timer
    if (this.tokenRefreshTimer) {
      window.clearTimeout(this.tokenRefreshTimer);
    }

    // Don't schedule if delay is negative or too short
    if (delayMs < 60000) { // Less than 1 minute
      console.warn('Token refresh delay too short, refreshing immediately');
      this.refreshToken();
      return;
    }

    // Schedule refresh
    this.tokenRefreshTimer = window.setTimeout(() => {
      this.refreshToken();
    }, delayMs);

    console.log(`Token refresh scheduled in ${Math.round(delayMs / 1000 / 60)} minutes`);
  }

  /**
   * Refresh access token
   */
  private async refreshToken(): Promise<void> {
    try {
      console.log('Refreshing Google Drive token...');
      
      // Google's implicit flow doesn't support refresh tokens
      // Need to re-authenticate the user
      await this.initGoogleAuth();

      const config = this.configService.config();
      if (!config) {
        throw new Error('Configuration not loaded!');
      }
      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: config.google.clientId,
        scope: this.SCOPES,
        prompt: '', // Use empty prompt for silent refresh
        callback: async (response: any) => {
          if (response.error) {
            console.error('Failed to refresh token:', response.error);
            // If silent refresh fails, user needs to re-authenticate
            this.isConnected.set(false);
            this.toast.error('Google Drive session expired. Please reconnect.');
            return;
          }

          await this.handleAuthSuccess(response.access_token, response.expires_in);
          console.log('Google Drive token refreshed successfully');
        },
      });

      tokenClient.requestAccessToken();
    } catch (error: any) {
      console.error('Token refresh error:', error);
      this.isConnected.set(false);
      this.toast.error('Google Drive session expired. Please reconnect.');
    }
  }
}
