import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';

import { Router, RouterModule } from '@angular/router';
import { NotificationService } from '../../../core/services/notification.service';
import { SupabaseService } from '../../../core/services/supabase.service';
import { Notification } from '../../../core/models/notification.model';

@Component({
  selector: 'app-notification-icon',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './notification-icon.html',
  styleUrls: ['./notification-icon.scss'],
})
export class NotificationIconComponent implements OnInit, OnDestroy {
  private notificationService = inject(NotificationService);
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  showDropdown = signal(false);
  notifications = signal<Notification[]>([]);
  unreadCount = signal(0);
  private channel: any;

  async ngOnInit() {
    await this.loadNotifications();
    await this.loadUnreadCount();
    this.subscribeToRealtime();
  }

  ngOnDestroy() {
    if (this.channel) {
      this.notificationService.unsubscribeFromNotifications(this.channel);
    }
  }

  async loadNotifications() {
    const session = await this.supabase.getSession();
    if (!session.session?.user) return;

    const notifications = await this.notificationService.getUserNotifications(
      session.session.user.id,
      false,
      10, // Load 10 most recent
    );
    this.notifications.set(notifications);
  }

  async loadUnreadCount() {
    const session = await this.supabase.getSession();
    if (!session.session?.user) return;

    const count = await this.notificationService.getUnreadCount(session.session.user.id);
    this.unreadCount.set(count);
  }

  subscribeToRealtime() {
    this.supabase.getSession().then((session) => {
      if (!session.session?.user) return;

      this.channel = this.notificationService.subscribeToNotifications(
        session.session.user.id,
        (notification) => {
          // Add new notification to the list
          this.notifications.update((notifications) => [
            notification,
            ...notifications.slice(0, 9), // Keep only 10 most recent
          ]);
          // Update unread count
          this.loadUnreadCount();
        },
      );
    });
  }

  toggleDropdown() {
    this.showDropdown.update((value) => !value);
  }

  closeDropdown() {
    this.showDropdown.set(false);
  }

  async markAsRead(notification: Notification, event: Event) {
    event.stopPropagation();

    if (notification.is_read) return;

    const success = await this.notificationService.markAsRead(notification.id);
    if (success) {
      // Update local state
      this.notifications.update((notifications) =>
        notifications.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n)),
      );
      await this.loadUnreadCount();
    }
  }

  async markAllAsRead() {
    const session = await this.supabase.getSession();
    if (!session.session?.user) return;

    const success = await this.notificationService.markAllAsRead(session.session.user.id);
    if (success) {
      // Update local state
      this.notifications.update((notifications) =>
        notifications.map((n) => ({ ...n, is_read: true })),
      );
      this.unreadCount.set(0);
    }
  }

  async deleteNotification(notification: Notification, event: Event) {
    event.stopPropagation();

    const success = await this.notificationService.deleteNotification(notification.id);
    if (success) {
      // Remove from local state
      this.notifications.update((notifications) =>
        notifications.filter((n) => n.id !== notification.id),
      );
      if (!notification.is_read) {
        await this.loadUnreadCount();
      }
    }
  }

  viewAllLogs() {
    this.closeDropdown();
    this.router.navigate(['/dashboard/activity-log']);
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'security':
        return 'fa-shield-halved';
      case 'activity':
        return 'fa-clock-rotate-left';
      case 'warning':
        return 'fa-triangle-exclamation';
      default:
        return 'fa-circle-info';
    }
  }

  getNotificationColor(type: string): string {
    switch (type) {
      case 'security':
        return 'text-red-500';
      case 'activity':
        return 'text-blue-500';
      case 'warning':
        return 'text-yellow-500';
      default:
        return 'text-gray-500';
    }
  }

  getRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  }
}
