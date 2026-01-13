import { Injectable } from '@angular/core';
import { Client, Account, Databases, Storage, Teams, Query } from 'appwrite';
import { environment } from '../../../environments/environment';
import { SocialLink } from '../models/social-link.model';

/**
 * Appwrite Service
 * Handles all Appwrite SDK interactions for the application
 */
@Injectable({
  providedIn: 'root',
})
export class AppwriteService {
  private client: Client;
  public account: Account;
  public databases: Databases;
  public storage: Storage;
  public teams: Teams;

  constructor() {
    // Initialize Appwrite client
    this.client = new Client();

    if (environment.appwrite?.endpoint && environment.appwrite?.projectId) {
      this.client
        .setEndpoint(environment.appwrite.endpoint)
        .setProject(environment.appwrite.projectId);
    }

    // Initialize services
    this.account = new Account(this.client);
    this.databases = new Databases(this.client);
    this.storage = new Storage(this.client);
    this.teams = new Teams(this.client);
  }

  /**
   * Get the Appwrite client instance
   */
  getClient(): Client {
    return this.client;
  }

  /**
   * Check if Appwrite is configured
   */
  isConfigured(): boolean {
    return !!(environment.appwrite?.endpoint && environment.appwrite?.projectId);
  }

  /**
   * List documents from a collection
   */
  async listDocuments(databaseId: string, collectionId: string, queries: string[] = []) {
    try {
      return await this.databases.listDocuments(databaseId, collectionId, queries);
    } catch (error) {
      console.error('Error listing Appwrite documents:', error);
      throw error;
    }
  }

  /**
   * Get all changelog entries, sorted by date descending
   */
  async getChangelogs() {
    try {
      if (!environment.appwrite?.databaseId) {
        throw new Error('Appwrite database ID not configured');
      }
      // Paginate through all documents and accumulate them. Appwrite's
      // `listDocuments` is paginated and returns up to a default page size,
      // so we must iterate to retrieve everything.
      const perPage = 100; // reasonable page size
      let offset = 0;
      const allDocs: any[] = [];

      while (true) {
        const response = await this.databases.listDocuments(
          environment.appwrite.databaseId,
          'change_logs',
          [Query.limit(perPage), Query.offset(offset)],
        );

        if (!response || !response.documents || response.documents.length === 0) break;

        allDocs.push(...response.documents);

        // If fewer than page size returned, we've reached the last page.
        if (response.documents.length < perPage) break;

        offset += perPage;
      }

      // Sort by date descending (most recent first)
      const sorted = allDocs.sort((a: any, b: any) => b.date.localeCompare(a.date));

      return sorted.map((doc: any) => ({ date: doc.date, changes: doc.changes }));
    } catch (error) {
      console.error('Error fetching changelogs from Appwrite:', error);
      throw error;
    }
  }

  /**
   * Get all active social links sorted by order
   */
  async getSocialLinks(): Promise<SocialLink[]> {
    try {
      if (!environment.appwrite?.databaseId) {
        throw new Error('Appwrite database ID not configured');
      }

      const response = await this.databases.listDocuments(
        environment.appwrite.databaseId,
        'social_links',
        [],
      );

      // Filter active and sort by order
      const links = response.documents
        .filter((link: any) => link.is_active)
        .sort((a: any, b: any) => a.order - b.order)
        .map((doc: any) => ({
          platform: doc.platform,
          url: doc.url,
          icon: doc.icon,
          display_name: doc.display_name,
          order: doc.order,
          is_active: doc.is_active,
        }));

      return links;
    } catch (error) {
      console.error('Error fetching social links from Appwrite:', error);
      return [];
    }
  }
}
