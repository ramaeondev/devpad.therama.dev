import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LinkPreviewComponent } from './link-preview.component';
import { LinkPreviewService } from '../../services/link-preview.service';
import { of, throwError } from 'rxjs';
import { LinkMetadata } from '../../models/microlink.model';

describe('LinkPreviewComponent', () => {
  let component: LinkPreviewComponent;
  let fixture: ComponentFixture<LinkPreviewComponent>;
  let linkPreviewService: jest.Mocked<LinkPreviewService>;

  beforeEach(async () => {
    // Create a mock service with Jest
    const mockService = {
      getMetadata: jest.fn()
    } as unknown as jest.Mocked<LinkPreviewService>;

    await TestBed.configureTestingModule({
      imports: [LinkPreviewComponent],
      providers: [
        { provide: LinkPreviewService, useValue: mockService }
      ]
    }).compileComponents();

    linkPreviewService = TestBed.inject(LinkPreviewService) as jest.Mocked<LinkPreviewService>;
    fixture = TestBed.createComponent(LinkPreviewComponent);
    component = fixture.componentInstance;
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with default values', () => {
      expect(component.showInline).toBe(false);
      expect(component.metadata()).toBeNull();
      expect(component.loading()).toBe(false);
      expect(component.error()).toBeNull();
    });

    it('should load metadata on init', () => {
      const mockMetadata: LinkMetadata = {
        url: 'https://example.com',
        title: 'Example',
        domain: 'example.com'
      };

      component.url = 'https://example.com';
      (linkPreviewService.getMetadata as jest.Mock).mockReturnValue(of(mockMetadata));

      component.ngOnInit();

      expect(linkPreviewService.getMetadata).toHaveBeenCalledWith('https://example.com');
      expect(component.metadata()).toEqual(mockMetadata);
    });
  });

  describe('Metadata Loading', () => {
    it('should handle successful metadata fetch', () => {
      const mockMetadata: LinkMetadata = {
        url: 'https://github.com',
        title: 'GitHub',
        description: 'Build software better',
        image: 'https://github.com/image.png',
        domain: 'github.com'
      };

      component.url = 'https://github.com';
      (linkPreviewService.getMetadata as jest.Mock).mockReturnValue(of(mockMetadata));

      component.ngOnInit();

      expect(component.metadata()).toEqual(mockMetadata);
      expect(component.loading()).toBe(false);
      expect(component.error()).toBeNull();
    });

    it('should handle metadata fetch error', () => {
      component.url = 'https://example.com';
      (linkPreviewService.getMetadata as jest.Mock).mockReturnValue(
        throwError(() => new Error('Network error'))
      );

      component.ngOnInit();

      expect(component.loading()).toBe(false);
      expect(component.error()).toBe('Failed to load link preview');
    });

    it('should handle missing URL', () => {
      component.url = '';

      component.ngOnInit();

      expect(component.error()).toBe('No URL provided');
    });

    it('should extract domain from metadata', () => {
      const mockMetadata: LinkMetadata = {
        url: 'https://google.com',
        domain: 'google.com'
      };

      component.url = 'https://google.com';
      (linkPreviewService.getMetadata as jest.Mock).mockReturnValue(of(mockMetadata));

      component.ngOnInit();

      expect(component.displayUrl()).toBe('google.com');
    });
  });

  describe('Computed Properties', () => {
    it('should compute hasImage correctly', () => {
      expect(component.hasImage()).toBe(false);

      component.metadata.set({
        url: 'https://example.com',
        image: 'https://example.com/image.png'
      });

      expect(component.hasImage()).toBe(true);
    });

    it('should compute hasMetadata correctly', () => {
      expect(component.hasMetadata()).toBe(false);

      component.metadata.set({
        url: 'https://example.com',
        title: 'Example'
      });

      expect(component.hasMetadata()).toBe(true);
    });

    it('should compute displayUrl with fallback', () => {
      component.url = 'https://example.com';

      expect(component.displayUrl()).toBe('https://example.com');

      component.metadata.set({
        url: 'https://example.com',
        domain: 'example.com'
      });

      expect(component.displayUrl()).toBe('example.com');
    });
  });

  describe('User Interactions', () => {
    it('should open link in new tab', () => {
      const openSpy = jest.spyOn(globalThis.window, 'open').mockReturnValue(null);
      component.url = 'https://example.com';

      component.openLink();

      expect(openSpy).toHaveBeenCalledWith(
        'https://example.com',
        '_blank',
        'noopener,noreferrer'
      );
      
      openSpy.mockRestore();
    });

    it('should normalize URL before opening', () => {
      const openSpy = jest.spyOn(globalThis.window, 'open').mockReturnValue(null);
      component.url = 'example.com';

      component.openLink();

      expect(openSpy).toHaveBeenCalledWith(
        'https://example.com',
        '_blank',
        'noopener,noreferrer'
      );
      
      openSpy.mockRestore();
    });

    it('should copy link to clipboard', () => {
      // Mock clipboard API
      const mockClipboard = {
        writeText: jest.fn().mockResolvedValue(undefined)
      };
      Object.defineProperty(navigator, 'clipboard', {
        value: mockClipboard,
        writable: true
      });

      component.url = 'https://example.com';
      component.metadata.set({ url: 'https://example.com' });

      component.copyLink();

      expect(mockClipboard.writeText).toHaveBeenCalledWith('https://example.com');
    });

    it('should handle favicon error gracefully', () => {
      const mockEvent = {
        target: { style: { display: '' } }
      } as unknown as Event;

      component.onFaviconError(mockEvent);

      expect((mockEvent.target as any).style.display).toBe('none');
    });
  });

  describe('Display Modes', () => {
    it('should render card mode by default', () => {
      component.showInline = false;
      component.metadata.set({
        url: 'https://example.com',
        title: 'Example'
      });

      fixture.detectChanges();

      const card = fixture.nativeElement.querySelector('.link-preview-card');
      expect(card).toBeTruthy();
    });

    it('should render inline mode when enabled', () => {
      component.showInline = true;
      component.loading.set(false);

      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.link-badge');
      expect(badge).toBeTruthy();
    });

    it('should not display inline mode while loading', () => {
      component.showInline = true;
      component.loading.set(true);

      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.link-badge');
      expect(badge).toBeFalsy();
    });
  });

  describe('Content Rendering', () => {
    it('should render preview with all metadata', () => {
      component.metadata.set({
        url: 'https://example.com',
        title: 'Example Title',
        description: 'Example Description',
        domain: 'example.com',
        image: 'https://example.com/image.png'
      });

      fixture.detectChanges();

      const title = fixture.nativeElement.querySelector('.preview-title');
      const description = fixture.nativeElement.querySelector('.preview-description');
      const domain = fixture.nativeElement.querySelector('.domain-name');

      expect(title?.textContent).toContain('Example Title');
      expect(description?.textContent).toContain('Example Description');
      expect(domain?.textContent).toContain('example.com');
    });

    it('should display action buttons', () => {
      component.metadata.set({
        url: 'https://example.com',
        title: 'Example'
      });

      fixture.detectChanges();

      const buttons = fixture.nativeElement.querySelectorAll('.action-btn');
      expect(buttons.length).toBe(2); // Open and Copy buttons
    });

    it('should display loading state', () => {
      component.loading.set(true);

      fixture.detectChanges();

      const loadingState = fixture.nativeElement.querySelector('.loading-state');
      expect(loadingState).toBeTruthy();
    });

    it('should display error state', () => {
      // Mock the service to return an error
      (linkPreviewService.getMetadata as jest.Mock).mockReturnValue(
        throwError(() => new Error('Failed to load'))
      );

      component.url = 'https://example.com';
      fixture.detectChanges(); // This triggers ngOnInit which calls getMetadata

      // The component should catch the error and set the error message
      expect(component.loading()).toBe(false);
      expect(component.hasMetadata()).toBe(false);
    });

    it('should display URL fallback when no metadata', () => {
      const mockMetadata: LinkMetadata = {
        url: 'https://example.com',
        domain: 'example.com'
      };

      (linkPreviewService.getMetadata as jest.Mock).mockReturnValue(of(mockMetadata));

      component.url = 'https://example.com';
      component.ngOnInit();
      fixture.detectChanges();

      // Now set to null to test the fallback
      component.metadata.set(null);
      component.error.set(null);
      component.loading.set(false);
      fixture.detectChanges();

      expect(component.hasMetadata()).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle metadata with missing title', () => {
      component.metadata.set({
        url: 'https://example.com',
        description: 'Only description'
      });

      fixture.detectChanges();

      const title = fixture.nativeElement.querySelector('.preview-title');
      expect(title).toBeFalsy();

      const description = fixture.nativeElement.querySelector('.preview-description');
      expect(description).toBeTruthy();
    });

    it('should handle metadata with missing image', () => {
      component.metadata.set({
        url: 'https://example.com',
        title: 'Example'
      });

      fixture.detectChanges();

      const imageSection = fixture.nativeElement.querySelector('.preview-image');
      expect(imageSection).toBeFalsy();
    });

    it('should handle very long titles and descriptions', () => {
      component.metadata.set({
        url: 'https://example.com',
        title: 'A'.repeat(200),
        description: 'B'.repeat(300)
      });

      fixture.detectChanges();

      const title = fixture.nativeElement.querySelector('.preview-title');
      const description = fixture.nativeElement.querySelector('.preview-description');

      expect(title).toBeTruthy();
      expect(description).toBeTruthy();
      // CSS should handle text truncation
    });

    it('should handle URLs without protocol', () => {
      const openSpy = jest.spyOn(globalThis.window, 'open').mockReturnValue(null);
      component.url = 'example.com';

      component.openLink();

      expect(openSpy).toHaveBeenCalledWith(
        'https://example.com',
        '_blank',
        'noopener,noreferrer'
      );
      
      openSpy.mockRestore();
    });

    it('should handle empty metadata response', () => {
      component.metadata.set({
        url: 'https://example.com'
      });
      component.loading.set(false);

      fixture.detectChanges();

      expect(component.hasMetadata()).toBe(false);
    });
  });

  describe('Icon Display', () => {
    it('should display favicon when available', () => {
      component.metadata.set({
        url: 'https://github.com',
        title: 'GitHub',
        favicon: 'https://github.com/favicon.ico'
      });

      fixture.detectChanges();

      const componentHtml = fixture.nativeElement.innerHTML;
      // Check that metadata with favicon is rendered
      expect(componentHtml).toContain('github.com');
    });

    it('should display fallback icon when favicon unavailable', () => {
      component.metadata.set({
        url: 'https://example.com',
        title: 'Example'
      });

      fixture.detectChanges();

      const faviconIcon = fixture.nativeElement.querySelector('.favicon-icon');
      expect(faviconIcon).toBeTruthy();
    });
  });

  describe('Response Time', () => {
    it('should load metadata quickly', (done) => {
      const mockMetadata = {
        url: 'https://example.com',
        title: 'Example'
      };

      component.url = 'https://example.com';
      (linkPreviewService.getMetadata as jest.Mock).mockReturnValue(of(mockMetadata));

      const startTime = performance.now();

      component.ngOnInit();

      setTimeout(() => {
        const endTime = performance.now();
        const responseTime = endTime - startTime;

        expect(responseTime).toBeLessThan(100); // Should be very fast (immediate observable)
        done();
      }, 10);
    });
  });
});
