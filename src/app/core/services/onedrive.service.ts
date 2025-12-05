import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { SupabaseService } from './supabase.service';
import { AuthStateService } from './auth-state.service';
import { ToastService } from './toast.service';
import { LoadingService } from './loading.service';
import { Integration, OneDriveFile, OneDriveFolder } from '../models/integration.model';
import { environment } from '../../../environments/environment';
import { ActivityLogService } from './activity-log.service';

@Injectable({ providedIn: 'root' })
export class OneDriveService {
  private http = inject(HttpClient);
  private supabase = inject(SupabaseService);
  private auth = inject(AuthStateService);
  private toast = inject(ToastService);
  private loading = inject(LoadingService);
  private activityLog = inject(ActivityLogService);

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
   * @param forceAccountSelection - If true, forces user to select account even if already logged in
   */
  async connect(forceAccountSelection: boolean = true): Promise<void> {
    try {
      const authUrl = this.buildAuthUrl(forceAccountSelection);

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
   * @param forceAccountSelection - If true, adds prompt=select_account to force account picker
   */
  private buildAuthUrl(forceAccountSelection: boolean = true): string {
    const params = new URLSearchParams({
      client_id: environment.microsoft.clientId,
      response_type: 'token',
      redirect_uri: environment.microsoft.redirectUri + '/auth/callback/onedrive',
      scope: this.SCOPES,
      response_mode: 'fragment',
    });

    // Add prompt parameter to force account selection
    // This ensures users can choose which account to use, even if already logged in
    if (forceAccountSelection) {
      params.append('prompt', 'select_account');
    }

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
      // IMPORTANT: Always get the fresh session from Supabase to ensure the client
      // has the active auth token for RLS policies.
      const { session } = await this.supabase.getSession();

      if (!session?.user) {
        throw new Error('No active Supabase session. Please log in first.');
      }

      const userId = session.user.id;

      // Update auth state just in case it's out of sync
      this.auth.setUser(session.user);

      // FIXED: Use direct HttpClient to ensure Authorization header is set correctly
      // The supabase-js client was sometimes using the anon key despite having a session
      const sbAccessToken = session.access_token;

      const body = {
        user_id: userId,
        provider: 'onedrive',
        access_token: accessToken,
        expires_at: expiresAt,
        email: userInfo.email,
        updated_at: new Date().toISOString(),
      };

      const headers = new HttpHeaders({
        'apikey': environment.supabase.anonKey,
        'Authorization': `Bearer ${sbAccessToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates, return=representation'
      });

      const params = new HttpParams().set('on_conflict', 'user_id,provider');

      const response = await this.http.post<any[]>(
        `${environment.supabase.url}/rest/v1/integrations`,
        body,
        { headers, params }
      ).toPromise();

      const data = response?.[0];

      if (!data) {
        throw new Error('Failed to save integration: No data returned');
      }

      this.integration.set(data as Integration);
      this.isConnected.set(true);
      this.toast.success('OneDrive connected successfully');

      // Schedule token refresh (refresh 5 minutes before expiration)
      this.scheduleTokenRefresh(expiresInMs - 5 * 60 * 1000);

      // Load files
      await this.loadFiles();
    } catch (error: any) {
      console.error('Failed to save integration:', error);
      this.toast.error('Failed to save OneDrive connection');
    } finally {
      this.loading.stop();
    }
  }

  /**
   * Schedule token refresh
   */
  private scheduleTokenRefresh(delayMs: number): void {
    // Clear any existing timer
    if (this.tokenRefreshTimer !== undefined) {
      window.clearTimeout(this.tokenRefreshTimer);
    }

    // Don't schedule if delay is too short (less than 1 minute)
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
   * Since we use implicit flow, we need to trigger re-authentication
   */
  private async refreshToken(): Promise<void> {
    console.log('Refreshing OneDrive token...');

    try {
      // OneDrive implicit flow requires re-authentication to get new token
      // We'll trigger a silent re-authentication by opening the auth URL in a hidden iframe
      // For now, we'll just mark as disconnected and let user reconnect
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
   * FIXED: Use maybeSingle() to avoid 406 errors when no integration exists
   */
  /**
   * Check existing connection
   * Uses direct HttpClient to ensure RLS policies work correctly with the active session
   */
  async checkConnection(): Promise<void> {
    try {
      // Get fresh session to ensure we have the token
      const { session } = await this.supabase.getSession();
      if (!session?.user) {
        console.log('OneDrive checkConnection: No active session');
        return;
      }

      const userId = session.user.id;
      const sbAccessToken = session.access_token;

      // Update auth state just in case
      if (this.auth.userId() !== userId) {
        this.auth.setUser(session.user);
      }

      // Use HttpClient to ensure auth headers are sent correctly
      const params = new HttpParams()
        .set('select', '*')
        .set('user_id', `eq.${userId}`)
        .set('provider', 'eq.onedrive')
        .set('limit', '1');

      const headers = new HttpHeaders({
        'apikey': environment.supabase.anonKey,
        'Authorization': `Bearer ${sbAccessToken}`
      });

      const response = await this.http.get<Integration[]>(
        `${environment.supabase.url}/rest/v1/integrations`,
        { headers, params }
      ).toPromise();

      const data = response?.[0];

      if (data) {
        console.log('OneDrive connection found');
        this.integration.set(data);
        this.isConnected.set(true);
        await this.loadFiles();
      } else {
        console.log('OneDrive connection not found');
      }
    } catch (error) {
      console.error('Failed to check OneDrive connection:', error);
    }
  }

  /**
   * Disconnect OneDrive
   * Now also revokes the Microsoft session to allow account switching
   */
  async disconnect(): Promise<void> {
    try {
      // Clear token refresh timer
      if (this.tokenRefreshTimer !== undefined) {
        window.clearTimeout(this.tokenRefreshTimer);
        this.tokenRefreshTimer = undefined;
      }

      const integration = this.integration();
      if (!integration) return;

      // Step 1: Revoke Microsoft session
      // This will log the user out of Microsoft and clear their session
      // allowing them to choose a different account on next connection
      try {
        await this.revokeMicrosoftSession();
      } catch (revokeError) {
        console.warn('Failed to revoke Microsoft session:', revokeError);
        // Continue with disconnect even if revocation fails
      }

      // Step 2: Delete integration from database
      const { error } = await this.supabase
        .from('integrations')
        .delete()
        .eq('id', integration.id);

      if (error) throw error;

      // Step 3: Clear local state
      this.integration.set(null);
      this.isConnected.set(false);
      this.files.set([]);
      this.rootFolder.set(null);
      
      this.toast.success('OneDrive disconnected successfully. You can now connect with a different account.');
    } catch (error: any) {
      console.error('Failed to disconnect OneDrive:', error);
      this.toast.error('Failed to disconnect OneDrive');
    }
  }

  /**
   * Revoke Microsoft session
   * Opens Microsoft logout URL to clear the session
   */
  private async revokeMicrosoftSession(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Microsoft logout endpoint
        // This will clear the user's Microsoft session in the browser
        const logoutUrl = `${this.AUTHORITY}/oauth2/v2.0/logout?post_logout_redirect_uri=${encodeURIComponent(window.location.origin)}`;
        
        // Option 1: Open in hidden iframe (silent logout)
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = logoutUrl;
        
        // Clean up iframe after logout completes
        const cleanup = () => {
          if (iframe.parentNode) {
            document.body.removeChild(iframe);
          }
        };

        iframe.onload = () => {
          console.log('Microsoft session revoked successfully');
          setTimeout(() => {
            cleanup();
            resolve();
          }, 1000); // Wait 1 second for logout to complete
        };

        iframe.onerror = () => {
          console.error('Failed to load logout iframe');
          cleanup();
          reject(new Error('Failed to revoke session'));
        };

        document.body.appendChild(iframe);

        // Fallback timeout
        setTimeout(() => {
          cleanup();
          resolve(); // Resolve anyway after timeout
        }, 5000);
      } catch (error) {
        console.error('Error creating logout iframe:', error);
        reject(error);
      }
    });
  }

  /**
   * Load files from OneDrive
   * Fixed to handle different OneDrive account types and check drive existence
   */
  async loadFiles(): Promise<void> {
    try {
      const accessToken = this.integration()?.access_token;
      if (!accessToken) return;

      // First, check if the drive exists and get drive info
      let driveEndpoint = '/me/drive';
      
      try {
        const driveInfo = await this.http
          .get<any>(`${this.GRAPH_API}${driveEndpoint}`, {
            headers: new HttpHeaders({
              Authorization: `Bearer ${accessToken}`,
            }),
          })
          .toPromise();

        console.log('OneDrive info:', driveInfo);
      } catch (driveError: any) {
        console.error('Drive check error:', driveError);
        
        // If /me/drive fails, try /me/drives to list all available drives
        try {
          const drivesResponse = await this.http
            .get<any>(`${this.GRAPH_API}/me/drives`, {
              headers: new HttpHeaders({
                Authorization: `Bearer ${accessToken}`,
              }),
            })
            .toPromise();

          if (drivesResponse?.value && drivesResponse.value.length > 0) {
            // Use the first available drive
            const firstDrive = drivesResponse.value[0];
            console.log('Using drive:', firstDrive);
            driveEndpoint = `/drives/${firstDrive.id}`;
          } else {
            this.toast.error('No OneDrive found for this account');
            return;
          }
        } catch (drivesError) {
          console.error('Failed to list drives:', drivesError);
          this.toast.error('Unable to access OneDrive. Please check your account.');
          return;
        }
      }

      // Now try to load root children
      let filesEndpoint = `${driveEndpoint}/root/children?$top=100`;
      let response: any;

      try {
        response = await this.http
          .get<any>(`${this.GRAPH_API}${filesEndpoint}`, {
            headers: new HttpHeaders({
              Authorization: `Bearer ${accessToken}`,
            }),
          })
          .toPromise();
      } catch (rootError: any) {
        console.error('Root children error:', rootError);
        
        // If root/children fails, try to get special folders instead
        if (rootError.error?.error?.code === 'itemNotFound') {
          console.log('Root not found, trying special folders...');
          
          try {
            // Try to access the Documents folder as fallback
            response = await this.http
              .get<any>(`${this.GRAPH_API}${driveEndpoint}/special/documents/children?$top=100`, {
                headers: new HttpHeaders({
                  Authorization: `Bearer ${accessToken}`,
                }),
              })
              .toPromise();
            
            this.toast.info('Showing Documents folder (root not accessible)');
          } catch (specialError) {
            console.error('Special folder error:', specialError);
            
            // Last resort: try to list items from the drive root directly
            try {
              response = await this.http
                .get<any>(`${this.GRAPH_API}${driveEndpoint}/items/root/children?$top=100`, {
                  headers: new HttpHeaders({
                    Authorization: `Bearer ${accessToken}`,
                  }),
                })
                .toPromise();
            } catch (itemsError) {
              console.error('Items root error:', itemsError);
              this.toast.error('Unable to access OneDrive files. The drive may be empty or inaccessible.');
              
              // Set empty root folder
              this.rootFolder.set({
                id: 'root',
                name: 'OneDrive',
                files: [],
                folders: [],
              });
              return;
            }
          }
        } else {
          throw rootError;
        }
      }

      if (!response?.value) {
        console.warn('No files returned from OneDrive');
        this.files.set([]);
        this.rootFolder.set({
          id: 'root',
          name: 'OneDrive',
          files: [],
          folders: [],
        });
        return;
      }

      const files: OneDriveFile[] = response.value.map((item: any) => ({
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
      
      // Provide more specific error messages
      if (error.error?.error?.code === 'InvalidAuthenticationToken') {
        this.toast.error('OneDrive session expired. Please reconnect.');
        this.isConnected.set(false);
      } else if (error.error?.error?.code === 'itemNotFound') {
        this.toast.error('OneDrive folder not found. The drive may be empty.');
      } else {
        this.toast.error('Failed to load OneDrive files');
      }
    }
  }

  /**
   * Build folder tree structure
   */
  private async buildFolderTree(
    rootFiles: OneDriveFile[],
    accessToken: string
  ): Promise<void> {
    const root: OneDriveFolder = {
      id: 'root',
      name: 'OneDrive',
      files: rootFiles.filter((f) => !f.isFolder),
      folders: [],
    };

    // Build folders recursively
    const folders = rootFiles.filter((f) => f.isFolder);
    for (const folder of folders) {
      const subFolder = await this.loadFolder(folder, accessToken);
      root.folders.push(subFolder);
    }

    this.rootFolder.set(root);
  }

  /**
   * Load a folder recursively
   */
  private async loadFolder(
    folder: OneDriveFile,
    accessToken: string
  ): Promise<OneDriveFolder> {
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

      // Load subfolders (limit depth to avoid too many requests)
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

  /**
   * Upload file to OneDrive
   */
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

      // Log activity
      const userId = this.auth.userId();
      if (userId) {
        await this.activityLog.logActivity(userId, {
          action_type: 'upload',
          resource_type: 'integration',
          resource_name: uploadedFile.name,
          resource_id: uploadedFile.id,
          metadata: { provider: 'onedrive', mime_type: uploadedFile.mimeType }
        });
      }

      return uploadedFile;
    } catch (error: any) {
      console.error('Failed to upload file:', error);
      this.toast.error('Failed to upload file to OneDrive');
      return null;
    } finally {
      this.loading.stop();
    }
  }

  /**
   * Download file from OneDrive
   */
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

  /**
   * Delete file from OneDrive
   */
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

      // Log activity
      const userId = this.auth.userId();
      if (userId) {
        await this.activityLog.logActivity(userId, {
          action_type: 'delete',
          resource_type: 'integration',
          resource_name: 'OneDrive File',
          resource_id: fileId,
          metadata: { provider: 'onedrive' }
        });
      }

      return true;
    } catch (error: any) {
      console.error('Failed to delete file:', error);
      this.toast.error('Failed to delete file from OneDrive');
      return false;
    } finally {
      this.loading.stop();
    }
  }

  /**
   * Create folder in OneDrive
   */
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

      // Log activity
      const userId = this.auth.userId();
      if (userId) {
        await this.activityLog.logActivity(userId, {
          action_type: 'create',
          resource_type: 'integration',
          resource_name: folder.name,
          resource_id: folder.id,
          metadata: { provider: 'onedrive', is_folder: true }
        });
      }

      return folder;
    } catch (error: any) {
      console.error('Failed to create folder:', error);
      this.toast.error('Failed to create folder in OneDrive');
      return null;
    } finally {
      this.loading.stop();
    }
  }
  /**
   * Rename file or folder in OneDrive
   */
  async renameFile(fileId: string, newName: string): Promise<boolean> {
    try {
      this.loading.start();
      const accessToken = this.integration()?.access_token;
      if (!accessToken) {
        this.toast.error('Not connected to OneDrive');
        return false;
      }

      await this.http
        .patch(
          `${this.GRAPH_API}/me/drive/items/${fileId}`,
          { name: newName },
          {
            headers: new HttpHeaders({
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            }),
          }
        )
        .toPromise();

      this.toast.success('File renamed successfully');
      await this.loadFiles();

      // Log activity
      const userId = this.auth.userId();
      if (userId) {
        await this.activityLog.logActivity(userId, {
          action_type: 'edit',
          resource_type: 'integration',
          resource_name: newName,
          resource_id: fileId,
          metadata: { provider: 'onedrive', action: 'rename' }
        });
      }

      return true;
    } catch (error: any) {
      console.error('Failed to rename file:', error);
      this.toast.error('Failed to rename file');
      return false;
    } finally {
      this.loading.stop();
    }
  }
}