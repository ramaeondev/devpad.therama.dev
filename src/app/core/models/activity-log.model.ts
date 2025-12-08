export type ActionType = 
  | 'create' 
  | 'edit' 
  | 'delete' 
  | 'upload' 
  | 'login' 
  | 'logout'
  | 'import'
  | 'export'
  | 'share'
  | 'view'
  | 'access'
  | 'fork'
  | 'unshare';

export type ResourceType = 
  | 'note' 
  | 'folder' 
  | 'integration' 
  | 'auth'
  | 'settings'
  | 'device'
  | 'share';

export interface ActivityLog {
  id: string;
  user_id: string;
  action_type: ActionType;
  resource_type: ResourceType;
  resource_id?: string;
  resource_name?: string;
  device_fingerprint: string;
  device_info?: {
    device_name?: string;
    device_type?: string;
    browser_name?: string;
    browser_version?: string;
    os_name?: string;
    os_version?: string;
  };
  metadata?: Record<string, any>;
  ip_address?: string;
  created_at: string;
}

export interface ActivityLogFilters {
  action_type?: ActionType | ActionType[];
  resource_type?: ResourceType | ResourceType[];
  start_date?: string;
  end_date?: string;
  device_fingerprint?: string;
  limit?: number;
  offset?: number;
}

export interface CreateActivityLogDto {
  action_type: ActionType;
  resource_type: ResourceType;
  resource_id?: string;
  resource_name?: string;
  metadata?: Record<string, any>;
}
