import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { SocialLink } from '../models/social-link.model';

/**
 * Read-only access to public reference data on the self-hosted therama.dev Supabase backend
 * (schema "static" at https://api-v3.therama.dev). No login needed.
 *
 * The publishable key is meant to be public: the backend only allows SELECT on this schema.
 * Override per environment with `staticApi: { url, publishableKey }` in the generated config.
 */
const DEFAULT_STATIC_API = {
  url: 'https://api-v3.therama.dev',
  publishableKey: 'sb_publishable_TvfycUXoZ1whU1e-L8qhH-_PwN2YmxB',
};

export interface ChangelogEntry {
  date: string;
  changes: string[];
}

interface SocialLinkRow {
  id: string;
  platform: string;
  url: string;
  icon: string;
  display_name: string;
  sort_order: number;
  is_active: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class StaticDataService {
  private readonly config = {
    ...DEFAULT_STATIC_API,
    ...((environment as { staticApi?: Partial<typeof DEFAULT_STATIC_API> }).staticApi ?? {}),
  };

  private async select<T>(table: string, query: string): Promise<T[]> {
    const url = `${this.config.url.replace(/\/$/, '')}/rest/v1/${table}?${query}`;
    const response = await fetch(url, {
      headers: {
        apikey: this.config.publishableKey,
        'Accept-Profile': 'static',
      },
    });
    if (!response.ok) {
      throw new Error(`static.${table}: ${response.status} ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Get all changelog entries, newest date first
   */
  async getChangelogs(): Promise<ChangelogEntry[]> {
    try {
      const rows = await this.select<ChangelogEntry>('change_logs', 'select=date,changes&order=date.desc');
      return rows.map((row) => ({ date: row.date, changes: row.changes ?? [] }));
    } catch (error) {
      console.error('Error fetching changelogs:', error);
      throw error;
    }
  }

  /**
   * Get all active social links sorted by order
   */
  async getSocialLinks(): Promise<SocialLink[]> {
    try {
      const rows = await this.select<SocialLinkRow>(
        'social_links',
        'select=id,platform,url,icon,display_name,sort_order,is_active&is_active=eq.true&order=sort_order.asc',
      );
      return rows.map((row) => ({
        $id: row.id,
        platform: row.platform,
        url: row.url,
        icon: row.icon,
        display_name: row.display_name,
        order: row.sort_order,
        is_active: row.is_active,
      }));
    } catch (error) {
      console.error('Error fetching social links:', error);
      return [];
    }
  }
}
