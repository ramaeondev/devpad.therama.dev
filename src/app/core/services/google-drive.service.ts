import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthStateService } from './auth-state.service';
import { ToastService } from './toast.service';
import { LoadingService } from './loading.service';
import { Integration, GoogleDriveFile, GoogleDriveFolder } from '../models/integration.model';
import { environment } from '../../../environments/environment';

declare const google: any;

@Injectable({ providedIn: 'root' })
export class GoogleDriveService {
  private supabase = inject(SupabaseService);
  private auth = inject(AuthStateService);
  private toast = inject(ToastService);
  private loading = inject(LoadingService);

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

      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: environment.google.clientId,
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
        
        // We persist the access token in Supabase and use it until the user disconnects.
        // Do not attempt silent refresh — token remains stored server-side.
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
      
      // No token refresh timer to clear — tokens are persisted in Supabase until disconnect.
      
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
      const params = new URLSearchParams({
        pageSize: '100',
        fields: 'files(id,name,mimeType,modifiedTime,size,webViewLink,iconLink,parents)',
        q: 'trashed=false',
      });

      const url = `https://www.googleapis.com/drive/v3/files?${params}`;

      const response = await this.authFetch(url, { method: 'GET', headers: { 'Accept': 'application/json' } });

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

      const url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,modifiedTime,size,webViewLink,iconLink,parents';

      const response = await this.authFetch(url, { method: 'POST', body: formData }, true, true);

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

      const response = await this.authFetch(url, { method: 'GET' });

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
      const url = `https://www.googleapis.com/drive/v3/files/${fileId}`;
      const response = await this.authFetch(url, { method: 'DELETE' });

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

      const url = 'https://www.googleapis.com/drive/v3/files';
      const response = await this.authFetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(metadata) });

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
      const url = `https://www.googleapis.com/drive/v3/files/${fileId}`;
      const response = await this.authFetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newName }) });

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
  // Token refresh intentionally removed: access tokens are persisted in Supabase

  /**
   * Refresh access token
   */
  // Token refresh intentionally removed: access tokens are persisted in Supabase

  // Helper: centralized fetch with token handling and server-side refresh
  private async authFetch(url: string, options: RequestInit = {}, allowMultipart = false, skipJsonHeaders = false): Promise<Response> {
    const integration = this.integration?.();
    const accessToken = integration?.access_token;

    if (!accessToken) {
      throw new Error('Not connected to Google Drive');
    }

    const headers = new Headers(options.headers || {});
    if (!allowMultipart && !skipJsonHeaders) {
      headers.set('Content-Type', 'application/json');
    }
    headers.set('Authorization', `Bearer ${accessToken}`);

    const resp = await fetch(url, { ...options, headers });

    if (resp.status === 401 || resp.status === 403) {
      // Try server-side refresh once
      const refreshed = await this.refreshViaServer();
      if (refreshed) {
        // Retry with new token
        const newAccess = this.integration()?.access_token;
        if (!newAccess) throw new Error('Failed to obtain new access token');
        headers.set('Authorization', `Bearer ${newAccess}`);
        return await fetch(url, { ...options, headers });
      }

      // Prompt user with a modal to reconnect (open server-side auth to obtain refresh_token)
      this.isConnected.set(false);
      try {
        const reconnect = window.confirm('Google Drive session expired. Would you like to re-authorize Google Drive now?');
        if (reconnect) {
          const userId = this.auth.userId();
          const authUrl = `${environment.google.refreshHost}/api/google/auth?user_id=${encodeURIComponent(userId)}`;
          window.open(authUrl, '_blank', 'noopener');
        } else {
          this.toast.error('Google Drive session expired. Please reconnect.');
        }
      } catch (e) {
        this.toast.error('Google Drive session expired. Please reconnect.');
      }
    }

    return resp;
  }

  private async refreshViaServer(): Promise<boolean> {
    try {
      const userId = this.auth.userId();
      // Call a server endpoint that will refresh the token using stored refresh_token
      const resp = await fetch('/api/google/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });

      if (!resp.ok) {
        console.warn('Server refresh failed:', resp.status);
        return false;
      }

      const data = await resp.json();
      if (data?.access_token) {
        // Update local integration state
        const current = this.integration ? this.integration() ?? {} : {};
        this.integration.set({ ...current, access_token: data.access_token, expires_at: data.expires_at } as Integration);
        this.isConnected.set(true);
        this.toast.success('Google Drive session refreshed');
        return true;
      }

      return false;
    } catch (err) {
      console.error('refreshViaServer error:', err);
      return false;
    }
  }
}


