import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { DeviceFingerprintService } from './device-fingerprint.service';
import {
  ActivityLog,
  ActivityLogFilters,
  CreateActivityLogDto,
  ResourceType,
} from '../models/activity-log.model';

@Injectable({
  providedIn: 'root',
})
export class ActivityLogService {
  private supabase = inject(SupabaseService);
  private deviceFingerprint = inject(DeviceFingerprintService);

  /**
   * Log an activity with device fingerprint
   */
  async logActivity(
    userId: string,
    dto: CreateActivityLogDto
  ): Promise<ActivityLog | null> {
    try {
      // Get device fingerprint and info
      const deviceInfo = await this.deviceFingerprint.getDeviceInfo();

      // Prepare activity log data
      const activityLogData = {
        user_id: userId,
        action_type: dto.action_type,
        resource_type: dto.resource_type,
        resource_id: dto.resource_id,
        resource_name: dto.resource_name,
        device_fingerprint: deviceInfo.fingerprint_id,
        device_info: {
          device_name: deviceInfo.device_name,
          device_type: deviceInfo.device_type,
          browser_name: deviceInfo.browser_name,
          browser_version: deviceInfo.browser_version,
          os_name: deviceInfo.os_name,
          os_version: deviceInfo.os_version,
        },
        metadata: dto.metadata,
      };

      // Insert activity log
      const { data, error } = await this.supabase
        .from('activity_logs')
        .insert(activityLogData)
        .select()
        .single();

      if (error) {
        console.error('Error logging activity:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in logActivity:', error);
      return null;
    }
  }

  /**
   * Get user's activity logs with optional filters
   */
  async getUserActivityLogs(
    userId: string,
    filters?: ActivityLogFilters
  ): Promise<ActivityLog[]> {
    try {
      let query = this.supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', userId);

      // Apply filters
      if (filters) {
        if (filters.action_type) {
          if (Array.isArray(filters.action_type)) {
            query = query.in('action_type', filters.action_type);
          } else {
            query = query.eq('action_type', filters.action_type);
          }
        }

        if (filters.resource_type) {
          if (Array.isArray(filters.resource_type)) {
            query = query.in('resource_type', filters.resource_type);
          } else {
            query = query.eq('resource_type', filters.resource_type);
          }
        }

        if (filters.start_date) {
          query = query.gte('created_at', filters.start_date);
        }

        if (filters.end_date) {
          query = query.lte('created_at', filters.end_date);
        }

        if (filters.device_fingerprint) {
          query = query.eq('device_fingerprint', filters.device_fingerprint);
        }

        if (filters.limit) {
          query = query.limit(filters.limit);
        }

        if (filters.offset) {
          query = query.range(
            filters.offset,
            filters.offset + (filters.limit || 10) - 1
          );
        }
      }

      // Order by created_at descending (most recent first)
      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching activity logs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserActivityLogs:', error);
      return [];
    }
  }

  /**
   * Get activity logs for a specific resource
   */
  async getActivityLogsByResource(
    resourceType: ResourceType,
    resourceId: string
  ): Promise<ActivityLog[]> {
    try {
      const { data, error } = await this.supabase
        .from('activity_logs')
        .select('*')
        .eq('resource_type', resourceType)
        .eq('resource_id', resourceId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching activity logs by resource:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getActivityLogsByResource:', error);
      return [];
    }
  }

  /**
   * Get activity log count for a user
   */
  async getActivityLogCount(
    userId: string,
    filters?: ActivityLogFilters
  ): Promise<number> {
    try {
      let query = this.supabase
        .from('activity_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Apply filters
      if (filters) {
        if (filters.action_type) {
          if (Array.isArray(filters.action_type)) {
            query = query.in('action_type', filters.action_type);
          } else {
            query = query.eq('action_type', filters.action_type);
          }
        }

        if (filters.resource_type) {
          if (Array.isArray(filters.resource_type)) {
            query = query.in('resource_type', filters.resource_type);
          } else {
            query = query.eq('resource_type', filters.resource_type);
          }
        }

        if (filters.start_date) {
          query = query.gte('created_at', filters.start_date);
        }

        if (filters.end_date) {
          query = query.lte('created_at', filters.end_date);
        }

        if (filters.device_fingerprint) {
          query = query.eq('device_fingerprint', filters.device_fingerprint);
        }
      }

      const { count, error } = await query;

      if (error) {
        console.error('Error getting activity log count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error in getActivityLogCount:', error);
      return 0;
    }
  }
}
