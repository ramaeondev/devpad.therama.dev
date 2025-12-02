import { Injectable } from '@angular/core';
import { Client, Account, Databases, Storage, Teams } from 'appwrite';
import { environment } from '../../../environments/environment';

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

}
