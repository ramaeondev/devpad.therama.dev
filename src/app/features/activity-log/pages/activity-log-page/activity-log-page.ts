import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ActivityLogService } from '../../../../core/services/activity-log.service';
import { SupabaseService } from '../../../../core/services/supabase.service';
import { ActivityLog, ActionType, ResourceType } from '../../../../core/models/activity-log.model';

@Component({
  selector: 'app-activity-log-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './activity-log-page.html',
  styleUrls: ['./activity-log-page.scss'],
})
export class ActivityLogPageComponent implements OnInit {
  private activityLogService = inject(ActivityLogService);
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  logs = signal<ActivityLog[]>([]);
  loading = signal(false);
  totalCount = signal(0);
  expandedLogId = signal<string | null>(null);
  
  // Expose Math to template
  Math = Math;
  
  // Filters
  selectedActionType = signal<ActionType | 'all'>('all');
  selectedResourceType = signal<ResourceType | 'all'>('all');
  selectedDateRange = signal<'today' | 'week' | 'month' | 'all'>('all');
  
  // Pagination
  currentPage = signal(1);
  pageSize = 20;
  
  totalPages = computed(() => Math.ceil(this.totalCount() / this.pageSize));

  actionTypes: (ActionType | 'all')[] = ['all', 'create', 'edit', 'delete', 'upload', 'login', 'logout'];
  resourceTypes: (ResourceType | 'all')[] = ['all', 'note', 'folder', 'integration', 'auth'];

  async ngOnInit() {
    await this.loadLogs();
  }

  async loadLogs() {
    this.loading.set(true);
    try {
      const session = await this.supabase.getSession();
      if (!session.session?.user) return;

      const filters: any = {
        limit: this.pageSize,
        offset: (this.currentPage() - 1) * this.pageSize,
      };

      if (this.selectedActionType() !== 'all') {
        filters.action_type = this.selectedActionType();
      }

      if (this.selectedResourceType() !== 'all') {
        filters.resource_type = this.selectedResourceType();
      }

      // Date range filter
      if (this.selectedDateRange() !== 'all') {
        const now = new Date();
        let startDate: Date;
        
        switch (this.selectedDateRange()) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          default:
            startDate = new Date(0);
        }
        
        filters.start_date = startDate.toISOString();
      }

      const [logs, count] = await Promise.all([
        this.activityLogService.getUserActivityLogs(session.session.user.id, filters),
        this.activityLogService.getActivityLogCount(session.session.user.id, filters),
      ]);

      this.logs.set(logs);
      this.totalCount.set(count);
    } catch (error) {
      console.error('Error loading activity logs:', error);
    } finally {
      this.loading.set(false);
    }
  }

  async onFilterChange() {
    this.currentPage.set(1); // Reset to first page
    await this.loadLogs();
  }

  async goToPage(page: number) {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    await this.loadLogs();
  }

  async nextPage() {
    if (this.currentPage() < this.totalPages()) {
      await this.goToPage(this.currentPage() + 1);
    }
  }

  async previousPage() {
    if (this.currentPage() > 1) {
      await this.goToPage(this.currentPage() - 1);
    }
  }

  getActionIcon(actionType: ActionType): string {
    switch (actionType) {
      case 'create':
        return 'fa-plus';
      case 'edit':
        return 'fa-pen';
      case 'delete':
        return 'fa-trash';
      case 'upload':
        return 'fa-upload';
      case 'login':
        return 'fa-arrow-right-to-bracket';
      case 'logout':
        return 'fa-arrow-right-from-bracket';
      default:
        return 'fa-circle';
    }
  }

  getActionColor(actionType: ActionType): string {
    switch (actionType) {
      case 'create':
        return 'text-green-500';
      case 'edit':
        return 'text-blue-500';
      case 'delete':
        return 'text-red-500';
      case 'upload':
        return 'text-purple-500';
      case 'login':
        return 'text-green-600';
      case 'logout':
        return 'text-gray-500';
      default:
        return 'text-gray-400';
    }
  }

  getResourceIcon(resourceType: ResourceType): string {
    switch (resourceType) {
      case 'note':
        return 'fa-file-lines';
      case 'folder':
        return 'fa-folder';
      case 'integration':
        return 'fa-plug';
      case 'auth':
        return 'fa-shield-halved';
      default:
        return 'fa-circle';
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return this.formatDate(dateString);
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  toggleRawJson(logId: string) {
    if (this.expandedLogId() === logId) {
      this.expandedLogId.set(null);
    } else {
      this.expandedLogId.set(logId);
    }
  }

  formatJson(log: ActivityLog): string {
    return JSON.stringify(log, null, 2);
  }

  downloadJson(log: ActivityLog) {
    const json = JSON.stringify(log, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-log-${log.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  copyJson(log: ActivityLog) {
    const json = JSON.stringify(log, null, 2);
    navigator.clipboard.writeText(json).then(() => {
      // Could add a toast notification here
      console.log('JSON copied to clipboard');
    });
  }
}
