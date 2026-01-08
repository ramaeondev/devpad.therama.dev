export enum ActivityAction {
  Create = 'create',
  Update = 'update',
  Delete = 'delete',
  Login = 'login',
  Logout = 'logout',
  ShareCreate = 'share_create',
  ShareUpdate = 'share_update',
  ShareDelete = 'share_delete',
  View = 'view',
  Download = 'download',
  Upload = 'upload',
  Import = 'import',
  Archive = 'archive',
  Restore = 'restore',
  Fork = 'fork',
}

export enum ActivityResource {
  Note = 'note',
  Folder = 'folder',
  Tag = 'tag',
  User = 'user',
  Profile = 'profile',
  Device = 'device',
  Integration = 'integration',
  PublicShare = 'public_share',
  Auth = 'auth',
}

export enum ActivityCategory {
  Access = 'access',
  Content = 'content',
  System = 'system',
  Security = 'security',
}

export interface ActivityLog {
  id: string;
  user_id?: string;
  resource_owner_id?: string;
  action_type: ActivityAction;
  resource_type: ActivityResource;
  resource_id?: string;
  resource_name?: string;
  category: ActivityCategory;
  device_fingerprint?: string;
  device_info?: {
    device_name?: string;
    device_type?: string;
    browser_name?: string;
    browser_version?: string;
    os_name?: string;
    os_version?: string;
  };
  ip_address?: string;
  session_id?: string;
  is_anonymous: boolean;
  metadata?: Record<string, any>;
  created_at: string;
  requires_notification?: boolean;
}

export interface ActivityLogFilters {
  action_type?: ActivityAction | ActivityAction[];
  resource_type?: ActivityResource | ActivityResource[];
  category?: ActivityCategory | ActivityCategory[];
  start_date?: string;
  end_date?: string;
  device_fingerprint?: string;
  session_id?: string;
  is_anonymous?: boolean;
  limit?: number;
  offset?: number;
}

export interface CreateActivityLogDto {
  action_type: ActivityAction;
  resource_type: ActivityResource;
  resource_id?: string;
  resource_name?: string;
  category?: ActivityCategory;
  metadata?: Record<string, any>;
  resource_owner_id?: string;
  is_anonymous?: boolean;
  session_id?: string;
  requires_notification?: boolean;
}
