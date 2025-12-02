import { Injectable } from '@angular/core';
import { AppwriteService } from './appwrite.service';
import { SocialLink } from '../models/social-link.model';

/**
 * Social Links Service
 * Fetches and manages social media links from Appwrite database
 */
@Injectable({
  providedIn: 'root',
})
export class SocialLinksService {
  // Configuration - must match Appwrite Console setup
  private readonly DATABASE_ID = 'devpad_main';
  private readonly COLLECTION_ID = 'social_links';

  constructor(private appwrite: AppwriteService) {}

  /**
   * Get all active social links sorted by order
   */
  async getActiveSocialLinks(): Promise<SocialLink[]> {
    try {
      console.log(`🔍 Fetching from Appwrite - Database: ${this.DATABASE_ID}, Collection: ${this.COLLECTION_ID}`);
      const response = await this.appwrite.listDocuments(
        this.DATABASE_ID,
        this.COLLECTION_ID
      );

      console.log('📦 Raw response from Appwrite:', response);
      const links = response.documents as unknown as SocialLink[];
      console.log('📋 Total documents:', links.length);
      
      // Filter active and sort by order
      const activeLinks = links
        .filter((link) => link.is_active)
        .sort((a, b) => a.order - b.order);
      
      console.log('✅ Active links:', activeLinks);
      return activeLinks;
    } catch (error) {
      console.error('❌ Error fetching social links:', error);
      return [];
    }
  }

  /**
   * Get all social links (including inactive)
   */
  async getAllSocialLinks(): Promise<SocialLink[]> {
    try {
      const response = await this.appwrite.listDocuments(
        this.DATABASE_ID,
        this.COLLECTION_ID
      );

      const links = response.documents as unknown as SocialLink[];
      return links.sort((a, b) => a.order - b.order);
    } catch (error) {
      console.error('Error fetching all social links:', error);
      return [];
    }
  }

  /**
   * Get a specific social link by platform
   */
  async getSocialLinkByPlatform(platform: string): Promise<SocialLink | null> {
    try {
      const links = await this.getAllSocialLinks();
      return links.find((link) => link.platform === platform) || null;
    } catch (error) {
      console.error('Error fetching social link by platform:', error);
      return null;
    }
  }
}
