/**
 * TypeScript Interfaces for Device Fingerprinting
 *
 * These interfaces match the Supabase database schema
 * for the user_devices table and related types.
 */

/**
 * User device record from database
 */
export interface UserDevice {
  id: string;
  user_id: string;

  // Fingerprint information
  fingerprint_id: string;
  visitor_id?: string; // FingerprintJS Pro only

  // Device information
  device_name?: string;
  device_type?: 'mobile' | 'tablet' | 'desktop';
  browser_name?: string;
  browser_version?: string;
  os_name?: string;
  os_version?: string;

  // Location information
  ip_address?: string;
  country?: string;
  city?: string;

  // Session tracking
  first_seen_at: string; // ISO 8601 timestamp
  last_seen_at: string; // ISO 8601 timestamp
  last_login_at: string; // ISO 8601 timestamp

  // Trust and security
  is_trusted: boolean;
  is_current: boolean;

  // Metadata
  user_agent?: string;
  additional_data?: DeviceAdditionalData;

  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp
}

/**
 * Additional device data stored in JSONB column
 */
export interface DeviceAdditionalData {
  screen_resolution?: string;
  color_depth?: number;
  timezone?: string;
  language?: string;
  platform?: string;
  [key: string]: any; // Allow additional custom fields
}

/**
 * Device information for registration
 */
export interface DeviceInfo {
  fingerprint_id: string;
  device_name?: string;
  device_type?: 'mobile' | 'tablet' | 'desktop';
  browser_name?: string;
  browser_version?: string;
  os_name?: string;
  os_version?: string;
  user_agent?: string;
  additional_data?: DeviceAdditionalData;
}

/**
 * Payload for creating a new device
 */
export interface CreateDevicePayload {
  user_id: string;
  fingerprint_id: string;
  visitor_id?: string;
  device_name?: string;
  device_type?: 'mobile' | 'tablet' | 'desktop';
  browser_name?: string;
  browser_version?: string;
  os_name?: string;
  os_version?: string;
  ip_address?: string;
  country?: string;
  city?: string;
  is_trusted?: boolean;
  is_current?: boolean;
  user_agent?: string;
  additional_data?: DeviceAdditionalData;
}

/**
 * Payload for updating device
 */
export interface UpdateDevicePayload {
  device_name?: string;
  last_login_at?: string;
  is_trusted?: boolean;
  is_current?: boolean;
  additional_data?: DeviceAdditionalData;
}

/**
 * Device detection result
 */
export interface DeviceDetection {
  deviceType: 'mobile' | 'tablet' | 'desktop';
  browser: string;
  browserVersion?: string;
  os: string;
  osVersion?: string;
  platform?: string;
}

/**
 * Device fingerprint result from FingerprintJS
 */
export interface FingerprintResult {
  visitorId: string;
  confidence?: {
    score: number;
    comment?: string;
  };
  components?: any;
}

/**
 * Device session summary
 */
export interface DeviceSession {
  deviceId: string;
  deviceName: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  browser: string;
  os: string;
  isTrusted: boolean;
  isCurrent: boolean;
  lastSeen: Date;
  location?: {
    city?: string;
    country?: string;
  };
}

/**
 * Device security status
 */
export interface DeviceSecurityStatus {
  deviceId: string;
  isTrusted: boolean;
  isNewDevice: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  lastSeenDaysAgo: number;
}

/**
 * Device statistics for analytics
 */
export interface DeviceStatistics {
  totalDevices: number;
  trustedDevices: number;
  activeDevices: number; // Active in last 30 days
  devicesByType: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
  topBrowsers: Array<{
    browser: string;
    count: number;
  }>;
  topOS: Array<{
    os: string;
    count: number;
  }>;
}

/**
 * Constants for device management
 */
export const DEVICE_CONSTANTS = {
  MAX_DEVICES_PER_USER: 10,
  DEVICE_EXPIRY_DAYS: 90,
  RECENT_ACTIVITY_DAYS: 30,

  DEVICE_TYPES: ['mobile', 'tablet', 'desktop'] as const,

  RISK_LEVELS: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
  } as const,

  // Common browsers
  BROWSERS: ['Chrome', 'Firefox', 'Safari', 'Edge', 'Opera', 'Brave'] as const,

  // Common operating systems
  OPERATING_SYSTEMS: ['Windows', 'macOS', 'Linux', 'Android', 'iOS', 'ChromeOS'] as const,
} as const;

/**
 * Type guards
 */
export const isValidDeviceType = (type: string): type is 'mobile' | 'tablet' | 'desktop' => {
  return ['mobile', 'tablet', 'desktop'].includes(type);
};

export const isUserDevice = (obj: any): obj is UserDevice => {
    return !!(
        obj &&
        typeof obj.id === 'string' &&
        typeof obj.user_id === 'string' &&
        typeof obj.fingerprint_id === 'string' &&
        typeof obj.is_trusted === 'boolean' &&
        typeof obj.is_current === 'boolean'
    );
};
