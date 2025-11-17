export interface Integration {
  id: string;
  user_id: string;
  provider: 'google_drive' | 'onedrive';
  access_token: string;
  refresh_token?: string;
  expires_at?: string;
  email?: string;
  created_at: string;
  updated_at: string;
}

export interface OneDriveFile {
  id: string;
  name: string;
  mimeType?: string;
  size?: number;
  webUrl?: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  folder?: { childCount: number };
  file?: { mimeType: string };
  parentReference?: { id: string; path: string };
  isFolder: boolean;
}

export interface OneDriveFolder {
  id: string;
  name: string;
  files: OneDriveFile[];
  folders: OneDriveFolder[];
}

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size?: string;
  webViewLink?: string;
  iconLink?: string;
  parents?: string[];
  isFolder: boolean;
}

export interface GoogleDriveFolder {
  id: string;
  name: string;
  files: GoogleDriveFile[];
  folders: GoogleDriveFolder[];
}

export interface SyncOperation {
  type: 'upload' | 'download' | 'move';
  source: 'local' | 'google_drive' | 'onedrive';
  destination: 'local' | 'google_drive' | 'onedrive';
  fileId: string;
  fileName: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  error?: string;
}
