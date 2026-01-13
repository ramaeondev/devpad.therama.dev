import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { DeviceFingerprintService } from './device-fingerprint.service';
import {
  ActivityLog,
  ActivityLogFilters,
  CreateActivityLogDto,
  ActivityAction,
  ActivityResource,
  ActivityCategory,
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
    userId: string | undefined, // Nullable for anon
    dto: CreateActivityLogDto,
  ): Promise<ActivityLog | null> {
    try {
      // Get device fingerprint and info
      const deviceInfo = await this.deviceFingerprint.getDeviceInfo();

      // Determine default category if not provided
      const category = dto.category || this.inferCategory(dto.action_type, dto.resource_type);

      // Prepare activity log data
      const activityLogData = {
        user_id: userId || null, // Handle undefined
        action_type: dto.action_type,
        resource_type: dto.resource_type,
        resource_id: dto.resource_id,
        resource_name: dto.resource_name,
        resource_owner_id: dto.resource_owner_id,
        category: category,
        device_fingerprint: deviceInfo.fingerprint_id,
        device_info: {
          device_name: deviceInfo.device_name,
          device_type: deviceInfo.device_type,
          browser_name: deviceInfo.browser_name,
          browser_version: deviceInfo.browser_version,
          os_name: deviceInfo.os_name,
          os_version: deviceInfo.os_version,
        },
        metadata: dto.metadata || {},
        is_anonymous: dto.is_anonymous || !userId,
        session_id: dto.session_id,
        requires_notification: dto.requires_notification || false,
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
   * Infer category based on action and resource
   */
  private inferCategory(action: ActivityAction, resource: ActivityResource): ActivityCategory {
    if (
      [ActivityAction.Login, ActivityAction.Logout].includes(action) ||
      resource === ActivityResource.Auth
    )
      return ActivityCategory.Security;
    if (
      [
        ActivityAction.Create,
        ActivityAction.Update,
        ActivityAction.Delete,
        ActivityAction.Archive,
        ActivityAction.Restore,
        ActivityAction.Upload,
        ActivityAction.Import,
      ].includes(action)
    )
      return ActivityCategory.Content;
    if (
      [
        ActivityAction.ShareCreate,
        ActivityAction.ShareUpdate,
        ActivityAction.ShareDelete,
        ActivityAction.View,
        ActivityAction.Download,
        ActivityAction.Fork,
      ].includes(action)
    )
      return ActivityCategory.Access;
    return ActivityCategory.System;
  }

  /**
   * Helper: Log a content action (Note, Folder, Tag)
   */
  async logContentAction(
    userId: string,
    action:
      | ActivityAction.Create
      | ActivityAction.Update
      | ActivityAction.Delete
      | ActivityAction.Archive
      | ActivityAction.Restore,
    resourceType: ActivityResource.Note | ActivityResource.Folder | ActivityResource.Tag,
    resourceId: string,
    resourceName: string,
    metadata?: any,
  ) {
    return this.logActivity(userId, {
      action_type: action,
      resource_type: resourceType,
      resource_id: resourceId,
      resource_name: resourceName,
      category: ActivityCategory.Content,
      metadata,
    });
  }

  /**
   * Helper: Log a sharing action
   */
  async logShareAction(
    userId: string,
    action: ActivityAction.ShareCreate | ActivityAction.ShareUpdate | ActivityAction.ShareDelete,
    resourceId: string, // The Public Share ID
    resourceName: string, // Name of the shard note
    metadata?: any,
  ) {
    return this.logActivity(userId, {
      action_type: action,
      resource_type: ActivityResource.PublicShare,
      resource_id: resourceId,
      resource_name: resourceName,
      category: ActivityCategory.Access,
      metadata,
    });
  }

  /**
   * Helper: Log an auth action
   */
  async logAuthAction(userId: string, action: ActivityAction.Login | ActivityAction.Logout) {
    return this.logActivity(userId, {
      action_type: action,
      resource_type: ActivityResource.Auth,
      category: ActivityCategory.Security,
    });
  }

  /**
   * Get user's activity logs with optional filters
   */
  async getUserActivityLogs(userId: string, filters?: ActivityLogFilters): Promise<ActivityLog[]> {
    try {
      let query = this.supabase
        .from('activity_logs')
        .select('*')
        .or(`user_id.eq.${userId},resource_owner_id.eq.${userId}`);

      // Apply filters
      if (filters) {
        if (filters.action_type) {
          const actions = Array.isArray(filters.action_type)
            ? filters.action_type
            : [filters.action_type];
          query = query.in('action_type', actions);
        }

        if (filters.resource_type) {
          const resources = Array.isArray(filters.resource_type)
            ? filters.resource_type
            : [filters.resource_type];
          query = query.in('resource_type', resources);
        }

        if (filters.category) {
          const categories = Array.isArray(filters.category)
            ? filters.category
            : [filters.category];
          query = query.in('category', categories);
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
          query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
        }
      }

      // Order by created_at descending (most recent first)
      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching activity logs:', error);
        return [];
      }

      return (data as ActivityLog[]) || [];
    } catch (error) {
      console.error('Error in getUserActivityLogs:', error);
      return [];
    }
  }

  /**
   * Get activity logs for a specific resource
   */
  async getActivityLogsByResource(
    resourceType: ActivityResource,
    resourceId: string,
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

      return (data as ActivityLog[]) || [];
    } catch (error) {
      console.error('Error in getActivityLogsByResource:', error);
      return [];
    }
  }

  /**
   * Get activity log count for a user
   */
  async getActivityLogCount(userId: string, filters?: ActivityLogFilters): Promise<number> {
    try {
      let query = this.supabase
        .from('activity_logs')
        .select('*', { count: 'exact', head: true })
        .or(`user_id.eq.${userId},resource_owner_id.eq.${userId}`);

      // Apply filters
      if (filters) {
        if (filters.action_type) {
          const actions = Array.isArray(filters.action_type)
            ? filters.action_type
            : [filters.action_type];
          query = query.in('action_type', actions);
        }

        if (filters.resource_type) {
          const resources = Array.isArray(filters.resource_type)
            ? filters.resource_type
            : [filters.resource_type];
          query = query.in('resource_type', resources);
        }

        if (filters.category) {
          const categories = Array.isArray(filters.category)
            ? filters.category
            : [filters.category];
          query = query.in('category', categories);
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
