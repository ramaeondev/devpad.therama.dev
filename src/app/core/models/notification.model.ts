export type NotificationType = 'security' | 'activity' | 'info' | 'warning';

export interface Notification {
  id: string;
  user_id: string;
  activity_log_id?: string;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  read_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateNotificationDto {
  title: string;
  message: string;
  type: NotificationType;
  activity_log_id?: string;
}
