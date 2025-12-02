/**
 * Social Link Model
 * Represents a social media or professional profile link
 */
export interface SocialLink {
  $id?: string;
  platform: string;
  url: string;
  icon: string; // Font Awesome icon class (e.g., 'fab fa-github')
  display_name: string;
  order: number;
  is_active: boolean;
  $createdAt?: string;
  $updatedAt?: string;
  $permissions?: string[];
  $databaseId?: string;
  $collectionId?: string;
}
