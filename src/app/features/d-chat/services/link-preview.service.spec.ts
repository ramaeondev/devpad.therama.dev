import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LinkPreviewService } from './link-preview.service';
import { provideHttpClient } from '@angular/common/http';

describe('LinkPreviewService', () => {
  let service: LinkPreviewService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LinkPreviewService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(LinkPreviewService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('URL Detection', () => {
    it('should extract URLs from text', () => {
      const text = 'Check out https://example.com and https://google.com';
      const urls = service.extractUrls(text);

      expect(urls.length).toBeGreaterThan(0);
      expect(urls[0]).toContain('example.com');
    });

    it('should handle multiple URLs with proper protocol', () => {
      const text = 'https://google.com https://github.com https://stackoverflow.com';
      const urls = service.extractUrls(text);

      expect(urls.length).toBeGreaterThanOrEqual(2);
    });

    it('should remove duplicate URLs', () => {
      const text = 'https://example.com https://example.com';
      const urls = service.extractUrls(text);

      expect(urls.length).toBe(1);
    });

    it('should NOT extract www URLs without protocol', () => {
      const text = 'www.example.com is not valid but https://www.example.com is';
      const urls = service.extractUrls(text);

      expect(urls.length).toBe(1);
      expect(urls[0]).toContain('https');
    });

    it('should not extract invalid URLs', () => {
      const text = 'This is just random text without URLs and rama.ddf should not be extracted';
      const urls = service.extractUrls(text);

      expect(urls.length).toBe(0);
    });

    it('should handle URLs with query parameters', () => {
      const text = 'https://google.com/search?q=test&lang=en';
      const urls = service.extractUrls(text);

      expect(urls.length).toBeGreaterThan(0);
      expect(urls[0]).toContain('google.com');
    });

    it('should handle URLs with fragments', () => {
      const text = 'https://example.com/page#section';
      const urls = service.extractUrls(text);

      expect(urls.length).toBeGreaterThan(0);
    });
  });

  describe('URL Validation', () => {
    it('should validate URLs with proper protocol', () => {
      const testUrls = ['https://example.com', 'http://google.com'];

      testUrls.forEach((url) => {
        expect(service['isValidUrl'](url)).toBe(true);
      });
    });

    it('should reject www URLs without protocol', () => {
      expect(service['isValidUrl']('www.github.com')).toBe(false);
    });

    it('should reject plain domain names', () => {
      expect(service['isValidUrl']('example.com')).toBe(false);
      expect(service['isValidUrl']('rama.ddf')).toBe(false);
    });

    it('should reject invalid URLs during extraction', () => {
      // Test that invalid URLs are filtered out during extraction
      const text = 'Check out rama.ddf and example.com but also https://valid.com';
      const urls = service.extractUrls(text);

      // Should only extract valid URLs with proper protocol
      expect(urls.length).toBe(1);
      expect(urls[0]).toContain('valid.com');
      expect(urls[0]).toContain('https');
    });

    it('should handle special characters in URLs', () => {
      const url = 'https://example.com/path-with-dash_and_underscore';
      expect(service['isValidUrl'](url)).toBe(true);
    });
  });

  describe('URL Normalization', () => {
    it('should return URL as-is when already properly formatted', () => {
      const normalized = service['normalizeUrl']('https://example.com');
      expect(normalized).toBe('https://example.com');
    });

    it('should preserve existing http protocol', () => {
      const normalized = service['normalizeUrl']('http://example.com');
      expect(normalized).toContain('http://');
    });

    it('should preserve https protocol', () => {
      const url = 'https://example.com';
      const normalized = service['normalizeUrl'](url);
      expect(normalized).toBe(url);
    });
  });

  describe('Domain Extraction', () => {
    it('should extract domain from URL', () => {
      const domain = service['extractDomain']('https://example.com/path');
      expect(domain).toBe('example.com');
    });

    it('should handle subdomains', () => {
      const domain = service['extractDomain']('https://api.github.com');
      expect(domain).toContain('github.com');
    });

    it('should handle URLs with ports', () => {
      const domain = service['extractDomain']('http://localhost:3000');
      expect(domain).toContain('localhost');
    });

    it('should handle invalid URLs gracefully', () => {
      const domain = service['extractDomain']('not a url');
      expect(domain).toBeTruthy();
    });
  });

  describe('Favicon Resolution', () => {
    it('should generate default favicon URL', () => {
      const favicon = service['getDefaultFavicon']('https://example.com');
      expect(favicon).toContain('example.com');
      expect(favicon).toContain('favicon');
    });

    it('should handle favicon with special characters', () => {
      const favicon = service['getDefaultFavicon']('https://my-domain.co.uk');
      expect(favicon).toBeTruthy();
    });

    it('should generate SVG fallback for invalid URLs', () => {
      const favicon = service['getDefaultFavicon']('invalid');
      expect(favicon).toContain('svg');
    });
  });

  describe('Metadata Fetching', () => {
    it('should return metadata for valid URL', (done) => {
      const url = 'https://example.com';
      const mockResponse = {
        status: 'success',
        data: {
          title: 'Example',
          description: 'Example description',
          url: url,
        },
      };

      service.getMetadata(url).subscribe((metadata) => {
        expect(metadata.url).toBe(url);
        expect(metadata.domain).toBeTruthy();
        done();
      });

      const req = httpMock.expectOne((req) => req.url.includes('microlink.io'));
      req.flush(mockResponse);
    });

    it('should handle basic metadata without metadata tags', (done) => {
      const url = 'https://example.com';
      const mockResponse = {
        status: 'success',
        data: {
          url: url,
        },
      };

      service.getMetadata(url).subscribe((metadata) => {
        expect(metadata).toBeTruthy();
        done();
      });

      const req = httpMock.expectOne((req) => req.url.includes('microlink.io'));
      req.flush(mockResponse);
    });

    it('should return basic metadata for invalid URL', (done) => {
      const url = 'not a url';

      service.getMetadata(url).subscribe((metadata) => {
        expect(metadata.url).toBe(url);
        done();
      });
    });

    it('should handle metadata fetch error gracefully', (done) => {
      const url = 'https://example.com';

      service.getMetadata(url).subscribe({
        next: (metadata) => {
          // Should return basic metadata as fallback
          expect(metadata).toBeTruthy();
          expect(metadata.url).toBe(url);
          expect(metadata.domain).toBe('example.com');
          done();
        },
        error: () => {
          fail('Should not error');
        },
      });

      const req = httpMock.expectOne((req) => req.url.includes('microlink.io'));
      req.error(new ErrorEvent('Network error'));
    });

    it('should handle server errors and return basic metadata', (done) => {
      const url = 'https://example.com';

      service.getMetadata(url).subscribe({
        next: (metadata) => {
          // Should return basic metadata as fallback
          expect(metadata).toBeTruthy();
          expect(metadata.url).toBe(url);
          expect(metadata.domain).toBe('example.com');
          done();
        },
        error: () => {
          fail('Should not error - should fallback to basic metadata');
        },
      });

      const req = httpMock.expectOne((req) => req.url.includes('microlink.io'));
      req.flush(null, { status: 500, statusText: 'Server Error' });
    });
  });

  describe('URL Detection Helpers', () => {
    it('should detect if content has URLs', () => {
      expect(service.hasUrls('Check https://example.com')).toBe(true);
      expect(service.hasUrls('No URLs here')).toBe(false);
    });

    it('should get first URL from content', () => {
      const firstUrl = service.getFirstUrl('Visit https://first.com and https://second.com');
      expect(firstUrl).toContain('first.com');
    });

    it('should return null if no URLs found', () => {
      const firstUrl = service.getFirstUrl('No URLs here');
      expect(firstUrl).toBeNull();
    });
  });

  describe('Performance', () => {
    it('should handle URL extraction quickly', () => {
      const text = 'https://example1.com https://example2.com https://example3.com'.repeat(10);
      const startTime = performance.now();

      service.extractUrls(text);

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(50); // Should be fast
    });

    it('should cache metadata for repeated URLs', (done) => {
      const url = 'https://example.com';
      let callCount = 0;

      service.getMetadata(url).subscribe(() => {
        callCount++;

        if (callCount === 1) {
          // Second call should use cache (no HTTP request)
          service.getMetadata(url).subscribe(() => {
            expect(callCount).toBe(1); // Service only called once, cached second time
            done();
          });
        }
      });

      const req = httpMock.expectOne((req) => req.url.includes('microlink.io'));
      req.flush({
        status: 'success',
        data: {
          title: 'Example',
          description: 'Example site',
          url: url,
        },
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string', () => {
      const urls = service.extractUrls('');
      expect(urls.length).toBe(0);
    });

    it('should handle URLs with special characters', () => {
      const text = 'https://example.com/path?key=value&other=test#section';
      const urls = service.extractUrls(text);
      expect(urls.length).toBeGreaterThan(0);
    });

    it('should handle URLs at different positions', () => {
      const atStart = 'https://example.com is great';
      const atEnd = 'Visit https://example.com';
      const inMiddle = 'Check https://example.com out';

      expect(service.extractUrls(atStart).length).toBeGreaterThan(0);
      expect(service.extractUrls(atEnd).length).toBeGreaterThan(0);
      expect(service.extractUrls(inMiddle).length).toBeGreaterThan(0);
    });

    it('should handle URLs without trailing slash', () => {
      const domain = service['extractDomain']('https://example.com');
      expect(domain).toBe('example.com');
    });

    it('should handle URLs with empty query parameters', () => {
      const url = 'https://example.com/path?=&key=';
      expect(service['isValidUrl'](url)).toBe(true);
    });
  });
});
