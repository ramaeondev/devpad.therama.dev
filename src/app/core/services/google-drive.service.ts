import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthStateService } from './auth-state.service';
import { ToastService } from './toast.service';
import { LoadingService } from './loading.service';
import { Integration, GoogleDriveFile, GoogleDriveFolder } from '../models/integration.model';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { ActivityLogService } from './activity-log.service';
import { ActivityAction, ActivityResource } from '../models/activity-log.model';

declare const google: any;

@Injectable({ providedIn: 'root' })
export class GoogleDriveService {
  pickerLoaded = signal(false);
  private supabase = inject(SupabaseService);
  private auth = inject(AuthStateService);
  private toast = inject(ToastService);
  private loading = inject(LoadingService);
  private http = inject(HttpClient);
  private activityLog = inject(ActivityLogService);

  // State
  isConnected = signal(false);
  integration = signal<Integration | null>(null);
  files = signal<GoogleDriveFile[]>([]);
  rootFolder = signal<GoogleDriveFolder | null>(null);

  private readonly SCOPES = [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/userinfo.email',
  ].join(' ');

  /**
   * Initialize Google Drive OAuth
   */
  async initGoogleAuth(): Promise<void> {
    return new Promise((resolve, reject) => {
      let loaded = 0;
      const checkLoaded = () => {
        loaded++;
        if (loaded === 2) {
          this.pickerLoaded.set(true);
          resolve();
        }
      };
      // Load Google Identity Services script
      if (typeof google === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = checkLoaded;
        script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
        document.head.appendChild(script);
      } else {
        checkLoaded();
      }
      // Load Google Picker API script
      if (!(window as any).gapi) {
        const pickerScript = document.createElement('script');
        pickerScript.src = 'https://apis.google.com/js/api.js';
        pickerScript.async = true;
        pickerScript.onload = () => {
          (window as any).gapi.load('picker', checkLoaded);
        };
        pickerScript.onerror = () => reject(new Error('Failed to load Google Picker API'));
        document.head.appendChild(pickerScript);
      } else {
        (window as any).gapi.load('picker', checkLoaded);
      }
    });
  }

  /**
   * Connect Google Drive
   */
  async connect(): Promise<void> {
    try {
      await this.initGoogleAuth();

      const codeClient = google.accounts.oauth2.initCodeClient({
        client_id: environment.google.clientId,
        scope: this.SCOPES,
        access_type: 'offline',
        callback: async (response: any) => {
          if (response.error) {
            this.toast.error('Failed to connect Google Drive');
            return;
          }
          // Send response.code to backend to exchange for tokens
          await this.handleAuthCode(response.code);
        },
      });

      codeClient.requestCode();
    } catch (error: any) {
      console.error('Google Drive connection error:', error);
      this.toast.error('Failed to connect Google Drive');
    }
  }

  /**
   * Debugging: Log OAuth token and expiration details
   */
  private logTokenDetails(token: string, expiresIn: number): void {
    console.log('OAuth Token:', token);
    console.log('Token Expiration (ms):', expiresIn);
  }

  /**
   * Debugging: Log Picker API errors
   */
  private logPickerError(error: any): void {
    console.error('Google Picker API Error:', error);
  }

  /**
   * Handle OAuth code: send to backend for token exchange
   */
  private async handleAuthCode(code: string): Promise<void> {
    try {
      this.loading.start();
      const userId = this.auth.userId();
      // Call backend to exchange code for tokens
      const data: any = await this.http
        .post(`${environment.supabase.url}/functions/v1/google-exchange`, { code, user_id: userId })
        .toPromise();

      if (!data?.access_token) {
        throw new Error('No access token returned from backend');
      }

      // Log token details for debugging
      this.logTokenDetails(data.access_token, data.expires_in || 3600);

      // Save integration to database (including refresh_token if present)
      const expiresAt = Date.now() + (data.expires_in || 3600) * 1000;
      const { error } = await this.supabase
        .from('integrations')
        .upsert(
          {
            user_id: userId,
            provider: 'google_drive',
            access_token: data.access_token,
            refresh_token: data.refresh_token ?? null,
            expires_at: expiresAt,
            email: data.email,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,provider' },
        )
        .select()
        .single();

      if (error) throw error;

      this.integration.set(data as Integration);
      this.isConnected.set(true);
      this.toast.success('Google Drive connected successfully');
      // Do not auto-list files. User must trigger listing via UI.
    } catch (error: any) {
      console.error('Failed to save integration:', error);
      this.toast.error('Failed to save Google Drive connection');
    } finally {
      this.loading.stop();
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
        .maybeSingle();

      if (!error && data) {
        const integration = data as Integration;

        // We persist the access token in Supabase and use it until the user disconnects.
        // Do not attempt silent refresh — token remains stored server-side.
        this.integration.set(integration);
        this.isConnected.set(true);

        // Load saved files from settings
        if (integration.settings?.selected_files) {
          const files = integration.settings.selected_files as GoogleDriveFile[];
          console.log('✅ Loaded', files.length, 'saved files from database');
          this.files.set(files);
          this.buildFolderTree(files);
        } else {
          console.log('ℹ️ No saved files found in database');
        }
      }
    } catch (error) {
      console.error('Failed to check Google Drive connection:', error);
    }
  }

  /**
   * Save selected files to Supabase
   */
  private async saveSelectedFiles(files: GoogleDriveFile[]) {
    try {
      const userId = this.auth.userId();
      if (!userId) return;

      const currentSettings = this.integration()?.settings || {};
      const newSettings = {
        ...currentSettings,
        selected_files: files,
      };

      const { error } = await this.supabase
        .from('integrations')
        .update({ settings: newSettings })
        .eq('user_id', userId)
        .eq('provider', 'google_drive');

      if (error) throw error;

      console.log('💾 Saved', files.length, 'files to database');

      // Update local state
      const current = this.integration();
      if (current) {
        this.integration.set({ ...current, settings: newSettings });
      }

      // Log activity
      await this.activityLog.logActivity(userId, {
        action_type: ActivityAction.Upload, // Using 'upload' as a proxy for 'import' since 'import' isn't in ActionType yet, or I should check ActionType
        resource_type: ActivityResource.Integration,
        resource_name: `Imported ${files.length} files from Google Drive`,
        metadata: { file_count: files.length, provider: 'google_drive' },
      });
    } catch (error) {
      console.error('Failed to save selected files:', error);
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
   * User-triggered: Pick files using Google Picker
   */
  async pickFiles(): Promise<void> {
    await this.showPicker('files');
  }

  /**
   * User-triggered: Pick a folder using Google Picker
   */
  async pickFolder(): Promise<void> {
    await this.showPicker('folder');
  }

  /**
   * User-triggered: Pick files shared with me
   */
  async pickSharedWithMe(): Promise<void> {
    await this.showPicker('shared');
  }

  /**
   * User-triggered: Search files by name
   */
  async searchFilesByName(query: string): Promise<void> {
    await this.showPicker('search', query);
  }

  /**
   * User-triggered: List Google Docs only
   */
  async listGoogleDocs(): Promise<void> {
    await this.showPicker('docs');
  }

  /**
   * Centralized Picker logic
   */
  private async showPicker(
    type: 'files' | 'folder' | 'shared' | 'search' | 'docs',
    query?: string,
  ): Promise<void> {
    if (!this.pickerLoaded()) {
      await this.initGoogleAuth();
    }
    const accessToken = this.integration()?.access_token;
    if (!accessToken) {
      this.toast.error('Not connected to Google Drive');
      return;
    }
    let view: any;
    const gPicker = (window as any).google?.picker;
    if (!gPicker) {
      this.toast.error('Google Picker API not loaded');
      return;
    }
    switch (type) {
      case 'files':
        view = new gPicker.DocsView().setIncludeFolders(true).setSelectFolderEnabled(false);
        break;
      case 'folder':
        view = new gPicker.DocsView().setIncludeFolders(true).setSelectFolderEnabled(true);
        break;
      case 'shared':
        view = new gPicker.DocsView().setIncludeFolders(true).setOwnedByMe(false);
        break;
      case 'search':
        view = new gPicker.DocsView().setIncludeFolders(true).setQuery(query ?? '');
        break;
      case 'docs':
        view = new gPicker.DocsView()
          .setIncludeFolders(true)
          .setMimeTypes('application/vnd.google-apps.document');
        break;
      default:
        view = new gPicker.DocsView();
    }
    // Only declare picker once, use gPicker for all references
    const pickerInstance = new gPicker.PickerBuilder()
      .addView(view)
      .setOAuthToken(accessToken)
      .setDeveloperKey(environment.google.apiKey)
      .setAppId(environment.google.appId) // Use the newly added App ID
      .setOrigin(window.location.origin) // Add Origin
      .setCallback((data: any) => {
        if (data.action === gPicker.Action.PICKED) {
          const newFiles: GoogleDriveFile[] = data.docs.map((doc: any) => ({
            id: doc.id,
            name: doc.name,
            mimeType: doc.mimeType,
            modifiedTime: doc.lastEditedUtc,
            size: doc.sizeBytes,
            webViewLink: doc.url,
            iconLink: doc.iconUrl,
            parents: doc.parents,
            isFolder: doc.mimeType === 'application/vnd.google-apps.folder',
          }));
          // Merge new selection with existing files, avoiding duplicates by id
          const existingFiles = this.files() ?? [];
          const mergedFilesMap = new Map<string, GoogleDriveFile>();
          [...existingFiles, ...newFiles].forEach((file) => {
            mergedFilesMap.set(file.id, file);
          });
          const mergedFiles = Array.from(mergedFilesMap.values());
          this.files.set(mergedFiles);
          this.buildFolderTree(mergedFiles);
          this.saveSelectedFiles(mergedFiles);
          this.toast.success('Files added from Google Drive');
        } else if (data.action === gPicker.Action.CANCEL) {
          this.toast.info('Picker action canceled');
        } else {
          this.logPickerError(data);
        }
      })
      .enableFeature(gPicker.Feature.MULTISELECT_ENABLED)
      .build();
    pickerInstance.setVisible(true);
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
        new Blob([JSON.stringify(metadata)], { type: 'application/json' }),
      );
      formData.append('file', file);

      const url =
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,modifiedTime,size,webViewLink,iconLink,parents';

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

      // Log activity
      const userId = this.auth.userId();
      if (userId) {
        await this.activityLog.logActivity(userId, {
          action_type: ActivityAction.Upload,
          resource_type: ActivityResource.Integration,
          resource_name: uploadedFile.name,
          resource_id: uploadedFile.id,
          metadata: { provider: 'google_drive', mime_type: uploadedFile.mimeType },
        });
      }

      // Optionally, trigger picker or refresh UI if needed
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
        'application/vnd.google-apps.document':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'application/vnd.google-apps.spreadsheet':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.google-apps.presentation':
          'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
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
        throw new Error(
          `Download failed: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`,
        );
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

      // Update local state and save
      const currentFiles = this.files();
      const newFiles = currentFiles.filter((f) => f.id !== fileId);
      this.files.set(newFiles);
      this.buildFolderTree(newFiles);
      this.saveSelectedFiles(newFiles);

      // Log activity
      const userId = this.auth.userId();
      if (userId) {
        await this.activityLog.logActivity(userId, {
          action_type: ActivityAction.Delete,
          resource_type: ActivityResource.Integration,
          resource_name: 'Google Drive File',
          resource_id: fileId,
          metadata: { provider: 'google_drive' },
        });
      }

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
      const response = await this.authFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metadata),
      });

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

      // Log activity
      const userId = this.auth.userId();
      if (userId) {
        await this.activityLog.logActivity(userId, {
          action_type: ActivityAction.Create,
          resource_type: ActivityResource.Integration,
          resource_name: folder.name,
          resource_id: folder.id,
          metadata: { provider: 'google_drive', is_folder: true },
        });
      }

      // Optionally, trigger picker or refresh UI if needed
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
      const response = await this.authFetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });

      if (!response.ok) {
        throw new Error(`Rename failed: ${response.status} ${response.statusText}`);
      }

      this.toast.success('File renamed successfully');

      // Log activity
      const userId = this.auth.userId();
      if (userId) {
        await this.activityLog.logActivity(userId, {
          action_type: ActivityAction.Update,
          resource_type: ActivityResource.Integration,
          resource_name: newName,
          resource_id: fileId,
          metadata: { provider: 'google_drive', action: 'rename' },
        });
      }

      // Optionally, trigger picker or refresh UI if needed
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
  private async authFetch(
    url: string,
    options: RequestInit = {},
    allowMultipart = false,
    skipJsonHeaders = false,
  ): Promise<Response> {
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

      // If refresh fails, mark as disconnected and notify user
      this.isConnected.set(false);
      this.toast.error('Google Drive session expired. Please reconnect.');
    }

    return resp;
  }

  private async refreshViaServer(): Promise<boolean> {
    try {
      const userId = this.auth.userId();
      // Call Supabase Edge Function for token refresh
      const data: any = await this.http
        .post(`${environment.supabase.url}/functions/v1/google-refresh`, { user_id: userId })
        .toPromise();

      if (data?.access_token) {
        // Update local integration state
        const current = this.integration ? (this.integration() ?? {}) : {};
        this.integration.set({
          ...current,
          access_token: data.access_token,
          expires_at: data.expires_at,
        } as Integration);
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
