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
   * Set API key (JWT) for authentication
   * Use this for API key-based authentication or JWT tokens
   * For user sessions, use account.createEmailSession instead
   */
  setApiKey(apiKey: string): void {
    this.client.setJWT(apiKey);
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
   * Get current user session
   */
  async getCurrentSession() {
    try {
      return await this.account.get();
    } catch (error) {
      console.error('No active Appwrite session:', error);
      return null;
    }
  }

  /**
   * Create a new session with email and password
   */
  async createEmailSession(email: string, password: string) {
    try {
      return await this.account.createEmailPasswordSession(email, password);
    } catch (error) {
      console.error('Error creating Appwrite session:', error);
      throw error;
    }
  }

  /**
   * Delete current session (logout)
   */
  async deleteSession() {
    try {
      return await this.account.deleteSession('current');
    } catch (error) {
      console.error('Error deleting Appwrite session:', error);
      throw error;
    }
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
   * Get a document by ID
   */
  async getDocument(databaseId: string, collectionId: string, documentId: string) {
    try {
      return await this.databases.getDocument(databaseId, collectionId, documentId);
    } catch (error) {
      console.error('Error getting Appwrite document:', error);
      throw error;
    }
  }

  /**
   * Create a new document
   */
  async createDocument(
    databaseId: string,
    collectionId: string,
    documentId: string,
    data: any,
    permissions?: string[]
  ) {
    try {
      return await this.databases.createDocument(
        databaseId,
        collectionId,
        documentId,
        data,
        permissions
      );
    } catch (error) {
      console.error('Error creating Appwrite document:', error);
      throw error;
    }
  }

  /**
   * Update a document
   */
  async updateDocument(
    databaseId: string,
    collectionId: string,
    documentId: string,
    data: any,
    permissions?: string[]
  ) {
    try {
      return await this.databases.updateDocument(
        databaseId,
        collectionId,
        documentId,
        data,
        permissions
      );
    } catch (error) {
      console.error('Error updating Appwrite document:', error);
      throw error;
    }
  }

  /**
   * Delete a document
   */
  async deleteDocument(databaseId: string, collectionId: string, documentId: string) {
    try {
      return await this.databases.deleteDocument(databaseId, collectionId, documentId);
    } catch (error) {
      console.error('Error deleting Appwrite document:', error);
      throw error;
    }
  }

  /**
   * Upload a file to storage
   */
  async uploadFile(bucketId: string, fileId: string, file: File, permissions?: string[]) {
    try {
      return await this.storage.createFile(bucketId, fileId, file, permissions);
    } catch (error) {
      console.error('Error uploading file to Appwrite:', error);
      throw error;
    }
  }

  /**
   * Get file preview URL
   */
  getFilePreview(
    bucketId: string,
    fileId: string,
    width?: number,
    height?: number,
    quality?: number
  ): string {
    return this.storage.getFilePreview(bucketId, fileId, width, height, undefined, quality).toString();
  }

  /**
   * Get file download URL
   */
  getFileDownload(bucketId: string, fileId: string): string {
    return this.storage.getFileDownload(bucketId, fileId).toString();
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(bucketId: string, fileId: string) {
    try {
      return await this.storage.deleteFile(bucketId, fileId);
    } catch (error) {
      console.error('Error deleting file from Appwrite:', error);
      throw error;
    }
  }
}
