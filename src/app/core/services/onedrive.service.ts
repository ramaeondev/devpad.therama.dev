import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { SupabaseService } from './supabase.service';
import { AuthStateService } from './auth-state.service';
import { ToastService } from './toast.service';
import { LoadingService } from './loading.service';
import { Integration, OneDriveFile, OneDriveFolder } from '../models/integration.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class OneDriveService {
  private http = inject(HttpClient);
  private supabase = inject(SupabaseService);
  private auth = inject(AuthStateService);
  private toast = inject(ToastService);
  private loading = inject(LoadingService);

  // State
  isConnected = signal(false);
  integration = signal<Integration | null>(null);
  files = signal<OneDriveFile[]>([]);
  rootFolder = signal<OneDriveFolder | null>(null);

  private readonly SCOPES = 'Files.ReadWrite.All offline_access User.Read';
  private readonly AUTHORITY = 'https://login.microsoftonline.com/common';
  private readonly GRAPH_API = 'https://graph.microsoft.com/v1.0';

  private tokenRefreshTimer?: number;

  /**
   * Connect OneDrive using OAuth 2.0 Implicit Flow
   */
  async connect(): Promise<void> {
    try {
      const authUrl = this.buildAuthUrl();

      // Open popup for OAuth
      const width = 500;
      const height = 600;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const popup = window.open(
        authUrl,
        'OneDrive Login',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!popup) {
        this.toast.error('Please allow popups for OneDrive authentication');
        return;
      }

      // Listen for OAuth callback
      window.addEventListener('message', this.handleOAuthCallback.bind(this), { once: true });
    } catch (error: any) {
      console.error('OneDrive connection error:', error);
      this.toast.error('Failed to connect OneDrive');
    }
  }

  /**
   * Build OAuth authorization URL
   */
  private buildAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: environment.microsoft.clientId,
      response_type: 'token',
      redirect_uri: environment.microsoft.redirectUri + '/auth/callback/onedrive',
      scope: this.SCOPES,
      response_mode: 'fragment',
    });

    return `${this.AUTHORITY}/oauth2/v2.0/authorize?${params.toString()}`;
  }

  /**
   * Handle OAuth callback
   */
  private handleOAuthCallback = async (event: MessageEvent) => {
    if (event.origin !== window.location.origin) return;

    const { accessToken, expiresIn, error } = event.data;

    if (error) {
      this.toast.error('Failed to connect OneDrive');
      return;
    }

    if (accessToken) {
      await this.handleAuthSuccess(accessToken, expiresIn);
    }
  };

  /**
   * Handle successful OAuth - with proper session verification
   */
  private async handleAuthSuccess(accessToken: string, expiresIn?: number): Promise<void> {
    try {
      this.loading.start();

      // CRITICAL: Ensure we have a valid Supabase session
      const { session } = await this.supabase.getSession();

      if (!session || !session.access_token) {
        throw new Error('No active Supabase session. Please log in first.');
      }

      console.log('✅ Supabase session verified:', {
        userId: session.user.id,
        tokenLength: session.access_token.length
      });

      // Get user info from Microsoft
      const userInfo = await this.getUserInfo(accessToken);

      // Calculate expiration time
      const expiresInMs = (expiresIn || 3600) * 1000;
      const expiresAt = Date.now() + expiresInMs;

      // Get user ID from session (not from auth state service)
      const userId = session.user.id;

      // Save integration to database
      // We need to manually set the Authorization header with the user's JWT
      const { data, error } = await this.supabase.client
        .from('integrations')
        .upsert(
          {
            user_id: userId,
            provider: 'onedrive',
            access_token: accessToken,
            expires_at: expiresAt,
            email: userInfo.email,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,provider' }
        )
        .select()
        .maybeSingle();

      if (error) {
        console.error('OneDrive integration save error:', {
          error,
          userId,
          errorCode: error.code,
          errorMessage: error.message,
        });
        throw error;
      }

      this.integration.set(data as Integration);
      this.isConnected.set(true);
      this.toast.success('OneDrive connected successfully');

      // Schedule token refresh
      this.scheduleTokenRefresh(expiresInMs - 5 * 60 * 1000);

      // Load files
      await this.loadFiles();
    } catch (error: any) {
      console.error('Failed to save integration:', error);

      if (error.message?.includes('No active Supabase session')) {
        this.toast.error('Please log in to DevPad first before connecting OneDrive');
      } else {
        this.toast.error('Failed to save OneDrive connection');
      }
    } finally {
      this.loading.stop();
    }
  }

  /**
   * Schedule token refresh
   */
  private scheduleTokenRefresh(delayMs: number): void {
    if (this.tokenRefreshTimer !== undefined) {
      window.clearTimeout(this.tokenRefreshTimer);
    }

    if (delayMs < 60 * 1000) {
      console.warn('Token expires too soon, will refresh on next API call');
      return;
    }

    console.log(`Scheduling OneDrive token refresh in ${Math.round(delayMs / 1000 / 60)} minutes`);

    this.tokenRefreshTimer = window.setTimeout(() => {
      this.refreshToken();
    }, delayMs);
  }

  /**
   * Refresh OneDrive access token
   */
  private async refreshToken(): Promise<void> {
    console.log('Refreshing OneDrive token...');

    try {
      this.isConnected.set(false);
      this.toast.error('OneDrive session expired. Please reconnect.');
    } catch (error) {
      console.error('Failed to refresh OneDrive token:', error);
      this.isConnected.set(false);
      this.toast.error('OneDrive session expired. Please reconnect.');
    }
  }

  /**
   * Get user info from Microsoft Graph
   */
  private async getUserInfo(accessToken: string): Promise<{ email: string }> {
    const response = await this.http
      .get<any>(`${this.GRAPH_API}/me`, {
        headers: new HttpHeaders({
          Authorization: `Bearer ${accessToken}`,
        }),
      })
      .toPromise();

    return { email: response!.mail || response!.userPrincipalName };
  }

  /**
   * Check existing connection
   */
  async checkConnection(): Promise<void> {
    try {
      const userId = this.auth.userId();
      const { data, error } = await this.supabase.client
        .from('integrations')
        .select('*')
        .eq('user_id', userId)
        .eq('provider', 'onedrive')
        .maybeSingle();

      if (error) {
        console.error('Error checking OneDrive connection:', error);
        return;
      }

      if (data) {
        this.integration.set(data as Integration);
        this.isConnected.set(true);
        await this.loadFiles();
      }
    } catch (error) {
      console.error('Failed to check OneDrive connection:', error);
    }
  }

  /**
   * Disconnect OneDrive
   */
  async disconnect(): Promise<void> {
    try {
      if (this.tokenRefreshTimer !== undefined) {
        window.clearTimeout(this.tokenRefreshTimer);
        this.tokenRefreshTimer = undefined;
      }

      const integration = this.integration();
      if (!integration) return;

      const { error } = await this.supabase.client
        .from('integrations')
        .delete()
        .eq('id', integration.id);

      if (error) throw error;

      this.integration.set(null);
      this.isConnected.set(false);
      this.files.set([]);
      this.rootFolder.set(null);
      this.toast.success('OneDrive disconnected successfully');
    } catch (error: any) {
      console.error('Failed to disconnect OneDrive:', error);
      this.toast.error('Failed to disconnect OneDrive');
    }
  }

  /**
   * Load files from OneDrive
   */
  async loadFiles(): Promise<void> {
    try {
      const accessToken = this.integration()?.access_token;
      if (!accessToken) return;

      const response = await this.http
        .get<any>(`${this.GRAPH_API}/me/drive/root/children?$top=100`, {
          headers: new HttpHeaders({
            Authorization: `Bearer ${accessToken}`,
          }),
        })
        .toPromise();

      const files: OneDriveFile[] = response!.value.map((item: any) => ({
        id: item.id,
        name: item.name,
        mimeType: item.file?.mimeType,
        size: item.size,
        webUrl: item.webUrl,
        createdDateTime: item.createdDateTime,
        lastModifiedDateTime: item.lastModifiedDateTime,
        folder: item.folder,
        file: item.file,
        parentReference: item.parentReference,
        isFolder: !!item.folder,
      }));

      this.files.set(files);
      await this.buildFolderTree(files, accessToken);
    } catch (error: any) {
      console.error('Failed to load files:', error);
      this.toast.error('Failed to load OneDrive files');
    }
  }

  // ... rest of the methods remain the same ...
  private async buildFolderTree(rootFiles: OneDriveFile[], accessToken: string): Promise<void> {
    const root: OneDriveFolder = {
      id: 'root',
      name: 'OneDrive',
      files: rootFiles.filter((f) => !f.isFolder),
      folders: [],
    };

    const folders = rootFiles.filter((f) => f.isFolder);
    for (const folder of folders) {
      const subFolder = await this.loadFolder(folder, accessToken);
      root.folders.push(subFolder);
    }

    this.rootFolder.set(root);
  }

  private async loadFolder(folder: OneDriveFile, accessToken: string): Promise<OneDriveFolder> {
    try {
      const response = await this.http
        .get<any>(`${this.GRAPH_API}/me/drive/items/${folder.id}/children`, {
          headers: new HttpHeaders({
            Authorization: `Bearer ${accessToken}`,
          }),
        })
        .toPromise();

      const items: OneDriveFile[] = response!.value.map((item: any) => ({
        id: item.id,
        name: item.name,
        mimeType: item.file?.mimeType,
        size: item.size,
        webUrl: item.webUrl,
        createdDateTime: item.createdDateTime,
        lastModifiedDateTime: item.lastModifiedDateTime,
        folder: item.folder,
        file: item.file,
        parentReference: item.parentReference,
        isFolder: !!item.folder,
      }));

      const result: OneDriveFolder = {
        id: folder.id,
        name: folder.name,
        files: items.filter((f) => !f.isFolder),
        folders: [],
      };

      const subFolders = items.filter((f) => f.isFolder);
      for (const subFolder of subFolders) {
        const loaded = await this.loadFolder(subFolder, accessToken);
        result.folders.push(loaded);
      }

      return result;
    } catch (error) {
      console.error('Failed to load folder:', folder.name, error);
      return {
        id: folder.id,
        name: folder.name,
        files: [],
        folders: [],
      };
    }
  }

  async uploadFile(file: File, folderId?: string): Promise<OneDriveFile | null> {
    try {
      this.loading.start();
      const accessToken = this.integration()?.access_token;
      if (!accessToken) {
        this.toast.error('Not connected to OneDrive');
        return null;
      }

      const path = folderId
        ? `/me/drive/items/${folderId}:/${file.name}:/content`
        : `/me/drive/root:/${file.name}:/content`;

      const response = await this.http
        .put<any>(`${this.GRAPH_API}${path}`, file, {
          headers: new HttpHeaders({
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': file.type || 'application/octet-stream',
          }),
        })
        .toPromise();

      const uploadedFile: OneDriveFile = {
        id: response!.id,
        name: response!.name,
        mimeType: response!.file?.mimeType,
        size: response!.size,
        webUrl: response!.webUrl,
        createdDateTime: response!.createdDateTime,
        lastModifiedDateTime: response!.lastModifiedDateTime,
        folder: response!.folder,
        file: response!.file,
        parentReference: response!.parentReference,
        isFolder: false,
      };

      this.toast.success('File uploaded to OneDrive');
      await this.loadFiles();
      return uploadedFile;
    } catch (error: any) {
      console.error('Failed to upload file:', error);
      this.toast.error('Failed to upload file to OneDrive');
      return null;
    } finally {
      this.loading.stop();
    }
  }

  async downloadFile(fileId: string): Promise<Blob | null> {
    try {
      this.loading.start();
      const accessToken = this.integration()?.access_token;
      if (!accessToken) {
        this.toast.error('Not connected to OneDrive');
        return null;
      }

      const response = await this.http
        .get(`${this.GRAPH_API}/me/drive/items/${fileId}/content`, {
          headers: new HttpHeaders({
            Authorization: `Bearer ${accessToken}`,
          }),
          responseType: 'blob',
        })
        .toPromise();

      return response!;
    } catch (error: any) {
      console.error('Failed to download file:', error);
      this.toast.error('Failed to download file from OneDrive');
      return null;
    } finally {
      this.loading.stop();
    }
  }

  async deleteFile(fileId: string): Promise<boolean> {
    try {
      this.loading.start();
      const accessToken = this.integration()?.access_token;
      if (!accessToken) {
        this.toast.error('Not connected to OneDrive');
        return false;
      }

      await this.http
        .delete(`${this.GRAPH_API}/me/drive/items/${fileId}`, {
          headers: new HttpHeaders({
            Authorization: `Bearer ${accessToken}`,
          }),
        })
        .toPromise();

      this.toast.success('File deleted from OneDrive');
      await this.loadFiles();
      return true;
    } catch (error: any) {
      console.error('Failed to delete file:', error);
      this.toast.error('Failed to delete file from OneDrive');
      return false;
    } finally {
      this.loading.stop();
    }
  }

  async createFolder(name: string, parentId?: string): Promise<OneDriveFile | null> {
    try {
      this.loading.start();
      const accessToken = this.integration()?.access_token;
      if (!accessToken) {
        this.toast.error('Not connected to OneDrive');
        return null;
      }

      const path = parentId
        ? `/me/drive/items/${parentId}/children`
        : '/me/drive/root/children';

      const response = await this.http
        .post<any>(
          `${this.GRAPH_API}${path}`,
          {
            name,
            folder: {},
            '@microsoft.graph.conflictBehavior': 'rename',
          },
          {
            headers: new HttpHeaders({
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            }),
          }
        )
        .toPromise();

      const folder: OneDriveFile = {
        id: response!.id,
        name: response!.name,
        webUrl: response!.webUrl,
        createdDateTime: response!.createdDateTime,
        lastModifiedDateTime: response!.lastModifiedDateTime,
        folder: response!.folder,
        parentReference: response!.parentReference,
        isFolder: true,
      };

      this.toast.success('Folder created in OneDrive');
      await this.loadFiles();
      return folder;
    } catch (error: any) {
      console.error('Failed to create folder:', error);
      this.toast.error('Failed to create folder in OneDrive');
      return null;
    } finally {
      this.loading.stop();
    }
  }
}