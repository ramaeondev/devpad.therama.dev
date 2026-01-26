/**
 * Data models for microlink.io API responses
 * https://docs.microlink.io/
 */

/**
 * Image metadata from microlink API
 */
export interface MicrolinkImage {
  url: string;
  type?: string;
  size?: number;
  height?: number;
  width?: number;
  size_pretty?: string;
}

/**
 * Logo metadata from microlink API
 */
export interface MicrolinkLogo {
  url: string;
  type?: string;
  size?: number;
  height?: number;
  width?: number;
  size_pretty?: string;
}

/**
 * Core metadata from microlink API response
 */
export interface MicrolinkData {
  lang?: string;
  author?: string | null;
  title?: string;
  publisher?: string;
  image?: MicrolinkImage;
  date?: string;
  url: string;
  description?: string;
  logo?: MicrolinkLogo;
}

/**
 * Complete microlink.io API response structure
 */
export interface MicrolinkResponse {
  status: 'success' | 'fail';
  data: MicrolinkData;
  statusCode: number;
  redirects?: string[];
  headers?: Record<string, string>;
}

/**
 * Simplified link metadata for display
 */
export interface LinkMetadata {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  favicon?: string;
  domain?: string;
  type?: string;
  author?: string;
  publisher?: string;
}
