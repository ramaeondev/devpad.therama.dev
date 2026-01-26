import { Component, Input, OnInit, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LinkPreviewService, LinkMetadata } from '../../services/link-preview.service';

/**
 * Component to display link previews with metadata (Open Graph tags)
 * Shows title, description, image, and favicon for shared links
 */
@Component({
  selector: 'app-link-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './link-preview.component.html',
  styleUrls: ['./link-preview.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LinkPreviewComponent implements OnInit {
  @Input() url!: string;
  @Input() showInline: boolean = false; // Show as inline badge vs card

  // Signals
  metadata = signal<LinkMetadata | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  // Computed properties
  hasImage = computed(() => !!this.metadata()?.image);
  hasMetadata = computed(() => {
    const data = this.metadata();
    return !!(data?.title || data?.description || data?.image);
  });
  displayUrl = computed(() => {
    const data = this.metadata();
    return data?.domain || this.url;
  });

  constructor(private readonly linkPreviewService: LinkPreviewService) {}

  ngOnInit(): void {
    this.loadMetadata();
  }

  /**
   * Load metadata for the URL
   */
  private loadMetadata(): void {
    if (!this.url) {
      this.error.set('No URL provided');
      return;
    }

    this.loading.set(true);
    this.linkPreviewService.getMetadata(this.url).subscribe({
      next: (data: LinkMetadata) => {
        this.metadata.set(data);
        this.loading.set(false);
      },
      error: (err: any) => {
        console.error('Error loading link metadata:', err);
        this.error.set('Failed to load link preview');
        this.loading.set(false);
        // Still set basic metadata
        const domain = this.url.split('/')[2] || this.url;
        this.metadata.set({ url: this.url, domain });
      }
    });
  }

  /**
   * Open link in new tab
   */
  openLink(): void {
    const normalizedUrl = this.url.startsWith('http') ? this.url : `https://${this.url}`;
    globalThis.window.open(normalizedUrl, '_blank', 'noopener,noreferrer');
  }

  /**
   * Copy link to clipboard
   */
  copyLink(): void {
    const text = this.metadata()?.url || this.url;
    if (text && typeof globalThis.navigator?.clipboard?.writeText === 'function') {
      globalThis.navigator.clipboard.writeText(text);
    }
  }

  /**
   * Handle favicon error
   */
  onFaviconError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }

  /**
   * Retry loading metadata
   */
  retryLoad(): void {
    this.error.set(null);
    this.metadata.set(null);
    this.loadMetadata();
  }
}
