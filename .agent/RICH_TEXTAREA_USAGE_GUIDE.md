# Rich Textarea Component - Usage & Examples

## Quick Start

### Basic Usage
```typescript
// 1. Import component in your module/component
import { RichTextareaComponent } from './components/rich-textarea/rich-textarea.component';

// 2. Add to imports
@Component({
  imports: [RichTextareaComponent]
})

// 3. Use in template
<app-rich-textarea
  [value]="messageInput()"
  (valueChange)="messageInput.set($event)"
  (sendMessage)="onSend()"
></app-rich-textarea>
```

---

## Full Example - D-Chat Integration

### Component TypeScript
```typescript
import { RichTextareaComponent } from './components/rich-textarea/rich-textarea.component';

@Component({
  selector: 'app-d-chat',
  standalone: true,
  imports: [CommonModule, RichTextareaComponent, ...otherImports],
  templateUrl: './d-chat.component.html',
  styleUrls: ['./d-chat.component.scss'],
})
export class DChatComponent implements OnInit {
  messageInput = signal<string>('');
  messages = signal<ChatMessage[]>([]);
  loading = signal<boolean>(false);

  constructor(private chatService: DChatService) {}

  ngOnInit(): void {
    // Initialize chat
    this.chatService.subscribeToMessages();
  }

  sendMessage(): void {
    const message = this.messageInput().trim();
    if (!message) return;

    this.chatService.sendMessage(message);
    this.messageInput.set('');
  }

  handleKeyDown(event: KeyboardEvent): void {
    // Enter key sends, Shift+Enter adds newline
    if (event.key === 'Enter' && !event.shiftKey) {
      this.sendMessage();
    }
  }
}
```

### Component Template
```html
<div class="chat-container">
  <!-- Messages List -->
  <div class="messages-list">
    @for (msg of messages(); track msg.id) {
      <div class="message" [class.own]="msg.isOwnMessage">
        <div class="message-content">{{ msg.content }}</div>
        <div class="message-time">{{ msg.timestamp | relativeTime }}</div>
      </div>
    }
  </div>

  <!-- Rich Textarea -->
  <div class="input-area">
    <app-rich-textarea
      [value]="messageInput()"
      (valueChange)="messageInput.set($event)"
      (sendMessage)="sendMessage()"
      (keyDown)="handleKeyDown($event)"
      [disabled]="loading()"
      placeholder="TYPE YOUR MESSAGE..."
      [rows]="2"
    ></app-rich-textarea>
  </div>
</div>
```

---

## Formatting Examples

### Available Formats & Usage

#### 1. Bold Text
```
Input:    Select "hello" and click Bold button
Output:   **hello**
Rendered: hello (in bold)
```

#### 2. Italic Text
```
Input:    Select "world" and click Italic button
Output:   *world*
Rendered: world (in italics)
```

#### 3. Underlined Text
```
Input:    Select "awesome" and click Underline button
Output:   __awesome__
Rendered: awesome (underlined)
```

#### 4. Strikethrough Text
```
Input:    Select "text" and click Strikethrough button
Output:   ~~text~~
Rendered: text (strikethrough)
```

#### 5. Inline Code
```
Input:    Select "function" and click Code button
Output:   `function`
Rendered: function (in code font)
```

#### 6. Code Block
```
Input:    Select "console.log('hi')" and click Code Block button
Output:   
  ```
  console.log('hi')
  ```
Rendered: Multi-line code block with gray background
```

#### 7. Quote
```
Input:    Select "Important message" and click Quote button
Output:   > Important message
Rendered: Indented quoted text
```

#### 8. Link
```
Input:    Select "GitHub" and click Link button
Output:   [GitHub](url)
Rendered: Clickable link (requires URL editing)
```

---

## Styling Customization

### CSS Variables
```scss
// Customize these variables to change appearance
--primary-color: #00ff41;        // Green neon
--secondary-color: #0a0a0a;      // Dark black
--text-color: #e0e0e0;           // Light gray
--border-color: rgba(0, 255, 65, 0.3);
--hover-color: rgba(0, 255, 65, 0.1);
```

### Custom Styling Example
```scss
// Override component styles in your component
::ng-deep .rich-textarea-container {
  // Custom styling
}

::ng-deep .format-toggle {
  // Custom button styling
}

::ng-deep .rich-textarea {
  // Custom textarea styling
}
```

---

## Event Handling

### valueChange Event
```typescript
onMessageChange(value: string): void {
  console.log('User typed:', value);
  this.messageInput.set(value);
  
  // Validation
  if (value.length > 500) {
    this.showWarning('Message too long');
  }
}
```

### sendMessage Event
```typescript
onSend(): void {
  const message = this.messageInput();
  if (!message.trim()) return;
  
  this.chatService.sendMessage(message);
  this.messageInput.set('');
  this.markMessageAsSent();
}
```

### keyDown Event
```typescript
handleKeyDown(event: KeyboardEvent): void {
  switch (event.key) {
    case 'Enter':
      if (!event.shiftKey) {
        event.preventDefault();
        this.sendMessage();
      }
      break;
    case 'Escape':
      this.messageInput.set('');
      break;
    case 'ArrowUp':
      if (!this.messageInput()) {
        this.loadLastMessage();
      }
      break;
  }
}
```

---

## Advanced Usage

### With Markdown Preview
```typescript
// In component
messagePreview = computed(() => {
  const raw = this.messageInput();
  return this.markdownService.parse(raw);
});
```

```html
<div class="preview">
  <h4>Preview:</h4>
  <div [innerHTML]="messagePreview()"></div>
</div>
```

### With Character Limit
```typescript
maxLength = 500;

onInput(value: string): void {
  if (value.length <= this.maxLength) {
    this.messageInput.set(value);
  }
}
```

```html
<div class="char-limit">
  <span>{{ messageLength }}/{{ maxLength }}</span>
  <div class="progress-bar" 
       [style.width.%]="(messageLength / maxLength) * 100">
  </div>
</div>
```

### With Draft Saving
```typescript
saveDraft = effect(() => {
  const message = this.messageInput();
  localStorage.setItem('chat-draft', message);
});

loadDraft(): void {
  const draft = localStorage.getItem('chat-draft');
  if (draft) {
    this.messageInput.set(draft);
  }
}
```

---

## Testing Examples

### Unit Tests
```typescript
describe('RichTextareaComponent', () => {
  let component: RichTextareaComponent;
  let fixture: ComponentFixture<RichTextareaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RichTextareaComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RichTextareaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should apply bold formatting', () => {
    component.internalValue.set('hello');
    component.applyFormat('bold');
    expect(component.internalValue()).toContain('**hello**');
  });

  it('should emit sendMessage when text is not empty', () => {
    const emitSpy = jest.spyOn(component.sendMessage, 'emit');
    component.internalValue.set('Hi');
    component.sendMsg();
    expect(emitSpy).toHaveBeenCalled();
  });

  it('should calculate character count correctly', () => {
    component.internalValue.set('Hello World');
    expect(component.charCount()).toBe(11);
  });

  it('should calculate word count correctly', () => {
    component.internalValue.set('Hello World Test');
    expect(component.wordCount()).toBe(3);
  });
});
```

---

## Common Patterns

### Pattern 1: Auto-Save Draft
```typescript
constructor(private messageService: MessageService) {
  effect(() => {
    const message = this.messageInput();
    this.messageService.saveDraft(message);
  });
}
```

### Pattern 2: Message Validation
```typescript
get isValidMessage(): boolean {
  const msg = this.messageInput().trim();
  return msg.length > 0 && msg.length <= 500;
}

sendMessage(): void {
  if (!this.isValidMessage) {
    this.showError('Invalid message');
    return;
  }
  // Send message
}
```

### Pattern 3: Real-time Suggestions
```typescript
suggestions = computed(() => {
  const text = this.messageInput();
  if (!text.startsWith('@')) return [];
  
  const mention = text.slice(1);
  return this.userService.searchUsers(mention);
});
```

### Pattern 4: Typing Indicator
```typescript
typingIndicator = effect(() => {
  const msg = this.messageInput();
  if (msg.length > 0) {
    this.chatService.setTyping(true);
  } else {
    this.chatService.setTyping(false);
  }
});
```

---

## Accessibility Features

### For Screen Readers
```html
<!-- All buttons have descriptive labels -->
<button aria-label="Toggle formatting options">FORMAT</button>
<button aria-label="Bold text (Ctrl+B)">
  <i class="fa-solid fa-bold"></i>
</button>

<!-- Textarea has proper label -->
<textarea 
  aria-label="Message input"
  placeholder="TYPE YOUR MESSAGE..."
></textarea>

<!-- Send button has descriptive label -->
<button aria-label="Send message">
  <i class="fa-solid fa-paper-plane"></i>
  SEND
</button>
```

### Keyboard Navigation
- **Tab**: Move between buttons
- **Space/Enter**: Activate button
- **Tab in textarea**: Format button → Send button
- **Shift+Tab**: Reverse navigation

---

## Performance Tips

### 1. Use OnPush Change Detection
```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush
})
```

### 2. Memoize Expensive Operations
```typescript
messageLength = computed(() => this.messageInput().length);
```

### 3. Track in Loops
```html
@for (msg of messages(); track msg.id) {
  <!-- Prevent unnecessary re-renders -->
}
```

### 4. Lazy Load Component
```typescript
// In app.routes.ts
{
  path: 'chat',
  loadComponent: () => import('./d-chat.component').then(m => m.DChatComponent)
}
```

---

## Browser Support

✅ Chrome/Edge 90+
✅ Firefox 88+
✅ Safari 14+
✅ Mobile Safari 14+
✅ Chrome Mobile 90+
✅ Firefox Mobile 88+

---

## Troubleshooting

### Issue: Component not rendering
**Solution**: Ensure it's added to component imports array

### Issue: Formatting not working
**Solution**: Check that textarea is properly initialized with `#textarea` ref

### Issue: Send button disabled
**Solution**: Verify text has content (use `.trim()`)

### Issue: Value not updating
**Solution**: Use `[value]` property and `(valueChange)` output

### Issue: Events not firing
**Solution**: Check component is not disabled via `[disabled]` property

---

## Resources

### Related Files
- Component: `src/app/features/d-chat/components/rich-textarea/`
- Integration: `src/app/features/d-chat/pages/d-chat.component.ts`
- Tests: `rich-textarea.component.spec.ts`

### Documentation
- Component Summary: `RICH_TEXTAREA_COMPONENT_SUMMARY.md`
- Implementation Details: `RICH_TEXTAREA_IMPLEMENTATION_COMPLETE.md`

---

## Support & Questions

For issues or questions:
1. Check the inline component documentation
2. Review unit tests for usage examples
3. Check console for TypeScript errors
4. Verify all imports are included

---

**Component Version**: 1.0.0
**Last Updated**: 2025-01-26
**Status**: Production Ready
