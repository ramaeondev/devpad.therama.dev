# LinkPreviewComponent - Implementation Guide

## Quick Start

### 1. Import the Component
```typescript
import { LinkPreviewComponent } from './link-preview/link-preview.component';

@Component({
  imports: [LinkPreviewComponent]
})
export class ChatComponent {}
```

### 2. Add to Template
```html
<app-link-preview [url]="'https://example.com'"></app-link-preview>
```

### 3. Run Tests
```bash
npm test -- --testPathPatterns="link-preview"
```

---

## Integration with ChatMessageComponent

### Step 1: Update ChatMessageComponent

```typescript
import { LinkPreviewComponent } from '../link-preview/link-preview.component';
import { LinkPreviewService } from '../../services/link-preview.service';

@Component({
  selector: 'app-chat-message',
  imports: [CommonModule, LinkPreviewComponent],
  templateUrl: './chat-message.component.html',
  styleUrls: ['./chat-message.component.scss']
})
export class ChatMessageComponent implements OnInit {
  @Input() message!: DMessage;
  
  messageUrls = signal<string[]>([]);
  
  constructor(private linkPreviewService: LinkPreviewService) {}
  
  ngOnInit(): void {
    if (this.message?.content) {
      // Extract URLs from message
      const urls = this.linkPreviewService.extractUrls(this.message.content);
      this.messageUrls.set(urls);
    }
  }
}
```

### Step 2: Update Template

```html
<!-- Existing message content -->
<div class="message-content">
  <p>{{ message.content }}</p>
</div>

<!-- Add link previews -->
@if (messageUrls().length > 0) {
  <div class="link-previews">
    @for (url of messageUrls(); track url) {
      <app-link-preview [url]="url"></app-link-preview>
    }
  </div>
}
```

### Step 3: Add Styling

```scss
.link-previews {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.75rem;
}
```

---

## Usage Patterns

### Pattern 1: Auto-detect Links in Chat

```typescript
// In chat-input component
import { LinkPreviewService } from '../../services/link-preview.service';

export class ChatInputComponent {
  constructor(
    private linkPreviewService: LinkPreviewService,
    private chatService: DChatService
  ) {}
  
  sendMessage(content: string): void {
    // Check for URLs before sending
    const hasUrls = this.linkPreviewService.hasUrls(content);
    
    // Send message
    this.chatService.sendMessage(content);
  }
}
```

### Pattern 2: Show Link Preview on Hover

```html
<!-- Inline badge mode for compact display -->
<app-link-preview 
  [url]="url" 
  [showInline]="true">
</app-link-preview>
```

### Pattern 3: Rich Message with Multiple Links

```typescript
export class ChatMessageComponent {
  @Input() message!: DMessage;
  
  urls = signal<string[]>([]);
  
  ngOnInit(): void {
    // Extract all URLs
    const urls = this.linkPreviewService.extractUrls(
      this.message.content
    );
    this.urls.set(urls);
  }
}
```

```html
<div class="message-with-previews">
  <!-- Message text -->
  <p class="message-text">{{ message.content }}</p>
  
  <!-- Link previews -->
  @if (urls().length > 0) {
    <div class="previews-section">
      <h4>Links in this message:</h4>
      @for (url of urls(); track url) {
        <app-link-preview [url]="url"></app-link-preview>
      }
    </div>
  }
</div>
```

---

## Backend Setup

### Express.js Backend Proxy

```typescript
// backend/routes/link-preview.ts
import express from 'express';
import axios from 'axios';

const router = express.Router();

router.post('/api/link-preview', async (req, res) => {
  try {
    const { url } = req.body;
    
    // Validate URL
    if (!url) {
      return res.status(400).json({ error: 'URL required' });
    }
    
    // Fetch HTML from URL with timeout
    const response = await axios.get(url, {
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    // Return HTML content
    res.json({ content: response.data });
  } catch (error) {
    console.error('Error fetching URL:', error);
    res.status(500).json({ error: 'Failed to fetch metadata' });
  }
});

export default router;
```

### Vercel Serverless Function

```typescript
// api/link-preview.ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

export default async (req: VercelRequest, res: VercelResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL required' });
  }
  
  try {
    const response = await axios.get(url, {
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });
    
    return res.status(200).json({ content: response.data });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch metadata' });
  }
};
```

---

## Configuration

### Service Configuration

```typescript
// In link-preview.service.ts
private readonly DEFAULT_TIMEOUT = 5000;      // Adjust as needed
private readonly PROXY_URL = '/api/link-preview'; // Change endpoint
```

### Environment Variables

```typescript
// environment.ts
export const environment = {
  production: false,
  linkPreviewApiUrl: 'http://localhost:3000/api/link-preview'
};

// environment.prod.ts
export const environment = {
  production: true,
  linkPreviewApiUrl: 'https://api.example.com/link-preview'
};
```

### Use Environment Config

```typescript
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class LinkPreviewService {
  private readonly PROXY_URL = environment.linkPreviewApiUrl;
}
```

---

## Styling Customization

### Use Custom CSS Variables

```scss
// In your component or global styles
:root {
  --preview-bg-color: rgba(0, 0, 0, 0.3);
  --preview-border-color: rgba(0, 255, 65, 0.3);
  --preview-text-color: #00ff41;
}

// In link-preview.component.scss
.link-preview-card {
  background: var(--preview-bg-color);
  border-color: var(--preview-border-color);
  color: var(--preview-text-color);
}
```

### Dark Mode Support

```scss
@media (prefers-color-scheme: dark) {
  .link-preview-card {
    background: rgba(0, 0, 0, 0.5);
  }
}

@media (prefers-color-scheme: light) {
  .link-preview-card {
    background: rgba(255, 255, 255, 0.95);
    color: #333;
  }
}
```

---

## Error Handling

### Service Level Error Handling

```typescript
constructor(private linkPreviewService: LinkPreviewService) {}

loadPreview(url: string): void {
  this.linkPreviewService.getMetadata(url).subscribe({
    next: (metadata) => {
      console.log('Loaded:', metadata);
    },
    error: (error) => {
      console.error('Failed to load preview:', error);
      // Show user-friendly error message
      this.showError('Could not load link preview');
    }
  });
}
```

### Component Level Error Handling

```html
<!-- Error state is handled by component -->
@if (error() && !loading()) {
  <div class="error-state">
    <p>{{ error() }}</p>
    <button (click)="retryLoad()">Retry</button>
  </div>
}
```

---

## Performance Optimization

### Caching Metadata

```typescript
private metadataCache = new Map<string, LinkMetadata>();

getMetadata(url: string): Observable<LinkMetadata> {
  // Check cache first
  if (this.metadataCache.has(url)) {
    return of(this.metadataCache.get(url)!);
  }
  
  // Fetch from backend
  return this.fetchViaProxy(url).pipe(
    tap(metadata => {
      // Cache result
      this.metadataCache.set(url, metadata);
    })
  );
}
```

### Lazy Loading Images

```html
<!-- Images are lazy-loaded by default -->
<img 
  [src]="data.image" 
  loading="lazy"
  alt="Preview image">
```

### Debounce URL Extraction

```typescript
private messageContent$ = new BehaviorSubject<string>('');

ngOnInit(): void {
  this.messageContent$
    .pipe(
      debounceTime(300),
      map(content => this.linkPreviewService.extractUrls(content))
    )
    .subscribe(urls => {
      this.messageUrls.set(urls);
    });
}

onMessageChange(content: string): void {
  this.messageContent$.next(content);
}
```

---

## Testing

### Unit Test Example

```typescript
it('should extract URLs from message', () => {
  const message = 'Check out https://example.com';
  const urls = service.extractUrls(message);
  
  expect(urls.length).toBeGreaterThan(0);
  expect(urls[0]).toContain('example.com');
});
```

### Integration Test Example

```typescript
it('should display link preview in chat message', () => {
  component.message = {
    content: 'Visit https://github.com'
  };
  component.ngOnInit();
  
  fixture.detectChanges();
  
  const preview = fixture.debugElement.query(
    By.directive(LinkPreviewComponent)
  );
  expect(preview).toBeTruthy();
});
```

### E2E Test Example

```typescript
// In e2e tests
it('should show link preview when message contains URL', () => {
  cy.visit('/chat');
  cy.get('[data-cy="message-input"]').type('Check https://example.com');
  cy.get('[data-cy="send-button"]').click();
  
  cy.get('.link-preview-card').should('be.visible');
  cy.get('.preview-title').should('not.be.empty');
});
```

---

## Deployment

### Build for Production

```bash
npm run build:prod
```

### Test Before Deploy

```bash
# Run all tests
npm test

# Run link preview tests specifically
npm test -- --testPathPatterns="link-preview"

# Check coverage
npm test -- --testPathPatterns="link-preview" --coverage
```

### Deploy Backend Proxy

```bash
# If using Vercel
vercel --prod

# If using Node.js server
npm run build
npm start
```

### Verify in Production

1. Test link preview loading
2. Check error handling
3. Verify metadata display
4. Test on mobile
5. Monitor performance metrics

---

## Troubleshooting

### Issue: Metadata not loading

**Check**:
1. Backend proxy is running
2. CORS headers are correct
3. URL is valid and accessible
4. Network timeout is sufficient

**Fix**:
```typescript
// Increase timeout if needed
private readonly DEFAULT_TIMEOUT = 10000; // 10 seconds
```

### Issue: Images not showing

**Check**:
1. Image URL is valid
2. Image server allows cross-origin
3. Image size is reasonable

**Fix**:
```html
<!-- Add error handling -->
<img 
  [src]="data.image" 
  (error)="onImageError($event)"
  alt="Preview">
```

### Issue: Performance degradation

**Check**:
1. Implement metadata caching
2. Use debouncing for URL extraction
3. Limit number of previews shown
4. Check bundle size

**Fix**:
```typescript
// Limit previews shown
const maxPreviews = 3;
this.messageUrls.set(urls.slice(0, maxPreviews));
```

---

## Best Practices

✅ **DO**:
- Cache metadata results
- Debounce URL extraction
- Handle errors gracefully
- Test with various URLs
- Optimize image loading

❌ **DON'T**:
- Fetch metadata synchronously
- Show all URLs in one go
- Ignore error states
- Fetch without timeout
- Store sensitive data in metadata

---

## Next Steps

1. **Integrate with ChatMessageComponent** - Add to existing messages
2. **Configure Backend** - Set up proxy endpoint
3. **Test Thoroughly** - Run all tests
4. **Deploy** - Ship to production
5. **Monitor** - Track usage and performance

---

**Ready to enhance your chat with link previews!** 🔗

For more details, see [LINKPREVIEW_DOCUMENTATION.md](LINKPREVIEW_DOCUMENTATION.md)
