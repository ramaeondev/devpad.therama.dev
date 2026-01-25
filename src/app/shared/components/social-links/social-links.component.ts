import { Component, OnInit, inject } from '@angular/core';

import { AppwriteService } from '../../../core/services/appwrite.service';
import { SocialLink } from '../../../core/models/social-link.model';

/**
 * Social Links Component
 * Displays social media links with Font Awesome icons
 * Can be integrated into About Us modal or footer
 */
@Component({
  selector: 'app-social-links',
  standalone: true,
  imports: [],
  template: `
    <div class="social-links-container">
      @if (loading) {
        <div class="flex items-center justify-center gap-4">
          <div class="animate-pulse flex gap-4">
            @for (i of [1, 2, 3, 4]; track i) {
              <div class="w-10 h-10 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
            }
          </div>
        </div>
      } @else if (socialLinks.length > 0) {
        <div class="flex items-center justify-center gap-4 flex-wrap">
          @for (link of socialLinks; track link.$id) {
            <a
              [href]="link.url"
              target="_blank"
              rel="noopener noreferrer"
              [title]="link.display_name"
              class="social-link"
            >
              <i [class]="link.icon + ' text-2xl'"></i>
              <span class="sr-only">{{ link.display_name }}</span>
            </a>
          }
        </div>
      } @else if (error) {
        <div class="text-center text-gray-500 dark:text-gray-400">
          <p class="text-sm">Unable to load social links</p>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .social-links-container {
        padding: 1rem 0;
      }

      .social-link {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 2.5rem;
        height: 2.5rem;
        border-radius: 0.5rem;
        transition: all 0.2s ease-in-out;
        color: var(--text-secondary);
        background-color: var(--bg-secondary);
      }

      .social-link:hover {
        transform: translateY(-2px);
        color: var(--primary-color);
        background-color: var(--bg-tertiary);
      }

      .social-link:active {
        transform: translateY(0);
      }

      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border-width: 0;
      }
    `,
  ],
})
export class SocialLinksComponent implements OnInit {
  private appwriteService = inject(AppwriteService);

  socialLinks: SocialLink[] = [];
  loading = true;
  error = false;

  async ngOnInit() {
    await this.loadSocialLinks();
  }

  private async loadSocialLinks() {
    try {
      this.loading = true;
      this.error = false;
      this.socialLinks = await this.appwriteService.getSocialLinks();
    } catch (err) {
      console.error('❌ Failed to load social links:', err);
      this.error = true;
    } finally {
      this.loading = false;
    }
  }
}
