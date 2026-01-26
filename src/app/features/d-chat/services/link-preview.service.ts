import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, timeout } from 'rxjs/operators';
import { LinkMetadata, MicrolinkResponse } from '../models/microlink.model';

// Re-export LinkMetadata for convenience
export type { LinkMetadata };

/**
 * Service to fetch and parse link metadata using microlink.io public API
 * Handles CORS and metadata extraction without needing a backend proxy
 */
@Injectable({
  providedIn: 'root'
})
export class LinkPreviewService {
  private readonly DEFAULT_TIMEOUT = 8000; // 8 seconds for API call
  private readonly MICROLINK_API = 'https://api.microlink.io'; // Free public API for link metadata
  private readonly metadataCache = new Map<string, LinkMetadata>();

  constructor(private readonly http: HttpClient) {}

  /**
   * Extract URLs from text content
   * Only accepts URLs with proper https:// or http:// protocol
   */
  extractUrls(content: string): string[] {
    const urls: string[] = [];

    // Extract URLs from markdown links: [text](url)
    const markdownRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    while ((match = markdownRegex.exec(content)) !== null) {
      const url = match[2];
      if (this.isValidUrl(url)) {
        urls.push(url);
      }
    }

    // Extract standalone URLs with proper protocol (http:// or https://)
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const standalonUrls = content.match(urlRegex) || [];

    // Filter valid URLs (those with proper protocol)
    standalonUrls
      .filter((url) => this.isValidUrl(url))
      .forEach(url => urls.push(url));

    // Remove duplicates
    return urls.filter((value, index, self) => self.indexOf(value) === index);
  }

  /**
   * Fetch metadata for a given URL using public API
   * Uses caching to avoid repeated API calls
   */
  getMetadata(url: string): Observable<LinkMetadata> {
    if (!this.isValidUrl(url)) {
      return of({ url, domain: this.extractDomain(url) });
    }

    // Check cache first
    if (this.metadataCache.has(url)) {
      return of(this.metadataCache.get(url)!);
    }

    // Fetch from public API
    return this.fetchFromMicrolinkAPI(url).pipe(
      catchError(() => {
        // Fallback: return basic metadata
        const basicMetadata = this.getBasicMetadata(url);
        this.metadataCache.set(url, basicMetadata);
        return of(basicMetadata);
      })
    );
  }

  /**
   * Fetch metadata from microlink.io public API
   * This API extracts Open Graph, Twitter Card, and other metadata
   */
  private fetchFromMicrolinkAPI(url: string): Observable<LinkMetadata> {
    const apiUrl = `${this.MICROLINK_API}?url=${encodeURIComponent(url)}`;

    return this.http.get<MicrolinkResponse>(apiUrl).pipe(
      timeout(this.DEFAULT_TIMEOUT),
      map((response) => {
        // Check if response is successful
        if (response.status !== 'success' || !response.data) {
          throw new Error('Invalid response from API');
        }
        
        // Parse and cache the metadata
        const metadata = this.parseMicrolinkResponse(response.data, url);
        this.metadataCache.set(url, metadata);
        return metadata;
      }),
      catchError(() => {
        throw new Error('Failed to fetch metadata from API');
      })
    );
  }

  /**
   * Parse microlink.io API response into LinkMetadata
   * Extracts the most important fields for display
   */
  private parseMicrolinkResponse(data: any, url: string): LinkMetadata {
    return {
      url,
      title: data.title || undefined,
      description: data.description || undefined,
      image: data.image?.url || data.logo?.url || undefined,
      favicon: data.logo?.url || undefined,
      domain: this.extractDomain(url),
      type: data.type || 'website',
      author: data.author || undefined,
      publisher: data.publisher || undefined
    };
  }



  /**
   * Get basic metadata without fetching content
   */
  /**
   * Get basic metadata without fetching (fallback)
   */
  private getBasicMetadata(url: string): LinkMetadata {
    return {
      url,
      domain: this.extractDomain(url),
      favicon: this.getDefaultFavicon(url)
    };
  }

  /**
   * Check if string is a valid URL
   * Only accepts URLs with proper https:// or http:// protocol
   */
  private isValidUrl(str: string): boolean {
    try {
      // Only accept URLs with proper protocol
      if (!str.startsWith('http://') && !str.startsWith('https://')) {
        return false;
      }
      new URL(str);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Normalize URL - only returns URLs with proper protocol
   */
  private normalizeUrl(url: string): string {
    // Only return URLs with proper protocol, no normalization needed
    // since isValidUrl now enforces proper protocol
    return url;
  }

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(this.normalizeUrl(url));
      return urlObj.hostname || url;
    } catch {
      return url;
    }
  }

  /**
   * Get favicon URL from domain
   */
  private getDefaultFavicon(url: string): string {
    try {
      const urlObj = new URL(this.normalizeUrl(url));
      return `${urlObj.protocol}//${urlObj.hostname}/favicon.ico`;
    } catch {
      return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><text x="2" y="14" font-size="12" fill="%2300ff41">🔗</text></svg>';
    }
  }



  /**
   * Detect if content contains URLs
   */
  hasUrls(content: string): boolean {
    return this.extractUrls(content).length > 0;
  }

  /**
   * Get first URL from content
   */
  getFirstUrl(content: string): string | null {
    const urls = this.extractUrls(content);
    return urls.length > 0 ? urls[0] : null;
  }
}
