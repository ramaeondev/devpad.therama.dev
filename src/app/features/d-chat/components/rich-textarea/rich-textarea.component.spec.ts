import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RichTextareaComponent } from './rich-textarea.component';

describe('RichTextareaComponent', () => {
  let component: RichTextareaComponent;
  let fixture: ComponentFixture<RichTextareaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RichTextareaComponent, CommonModule, FormsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(RichTextareaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Input and Output Properties', () => {
    it('should have default placeholder', () => {
      expect(component.placeholder).toBe('TYPE YOUR MESSAGE...');
    });

    it('should have default disabled state as false', () => {
      expect(component.disabled).toBe(false);
    });

    it('should have default rows as 2', () => {
      expect(component.rows).toBe(2);
    });

    it('should set placeholder from input', () => {
      component.placeholder = 'Custom placeholder';
      expect(component.placeholder).toBe('Custom placeholder');
    });

    it('should update value from input setter', () => {
      component.value = 'Hello';
      expect(component.internalValue()).toBe('Hello');
    });
  });

  describe('Signal Management', () => {
    it('should initialize internalValue as empty signal', () => {
      expect(component.internalValue()).toBe('');
    });

    it('should initialize showFormatting as false', () => {
      expect(component.showFormatting()).toBe(false);
    });

    it('should update internalValue on input', () => {
      const event = new Event('input');
      const textarea = document.createElement('textarea');
      textarea.value = 'Test message';
      Object.defineProperty(event, 'target', { value: textarea });

      component.onInput(event);
      expect(component.internalValue()).toBe('Test message');
    });
  });

  describe('Computed Properties', () => {
    it('should calculate charCount correctly', () => {
      component.internalValue.set('Hello');
      expect(component.charCount()).toBe(5);
    });

    it('should calculate charCount with empty string', () => {
      component.internalValue.set('');
      expect(component.charCount()).toBe(0);
    });

    it('should calculate wordCount correctly', () => {
      component.internalValue.set('Hello world test');
      expect(component.wordCount()).toBe(3);
    });

    it('should calculate wordCount with single word', () => {
      component.internalValue.set('Hello');
      expect(component.wordCount()).toBe(1);
    });

    it('should calculate wordCount as 0 for empty string', () => {
      component.internalValue.set('');
      expect(component.wordCount()).toBe(0);
    });

    it('should calculate rowCount with minimum rows', () => {
      component.rows = 2;
      component.internalValue.set('Hello');
      expect(component.rowCount()).toBe(2);
    });

    it('should calculate rowCount with multiple lines', () => {
      component.rows = 2;
      component.internalValue.set('Line 1\nLine 2\nLine 3\nLine 4');
      expect(component.rowCount()).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Formatting Methods', () => {
    beforeEach(() => {
      component.internalValue.set('text');
      const textarea = document.createElement('textarea');
      textarea.value = 'text';
      component.textareaRef = { nativeElement: textarea };
    });

    it('should apply bold formatting', () => {
      const emitSpy = jest.spyOn(component.valueChange, 'emit');
      component.applyFormat('bold');
      const result = component.internalValue();
      expect(result).toContain('**');
      expect(emitSpy).toHaveBeenCalled();
    });

    it('should apply italic formatting', () => {
      const emitSpy = jest.spyOn(component.valueChange, 'emit');
      component.applyFormat('italic');
      const result = component.internalValue();
      expect(result).toContain('*');
      expect(emitSpy).toHaveBeenCalled();
    });

    it('should apply underline formatting', () => {
      const emitSpy = jest.spyOn(component.valueChange, 'emit');
      component.applyFormat('underline');
      const result = component.internalValue();
      expect(result).toContain('__');
      expect(emitSpy).toHaveBeenCalled();
    });

    it('should apply strikethrough formatting', () => {
      const emitSpy = jest.spyOn(component.valueChange, 'emit');
      component.applyFormat('strikethrough');
      const result = component.internalValue();
      expect(result).toContain('~~');
      expect(emitSpy).toHaveBeenCalled();
    });

    it('should apply code formatting', () => {
      const emitSpy = jest.spyOn(component.valueChange, 'emit');
      component.applyFormat('code');
      const result = component.internalValue();
      expect(result).toContain('`');
      expect(emitSpy).toHaveBeenCalled();
    });

    it('should apply codeblock formatting', () => {
      const emitSpy = jest.spyOn(component.valueChange, 'emit');
      component.applyFormat('codeblock');
      const result = component.internalValue();
      expect(result).toContain('```');
      expect(emitSpy).toHaveBeenCalled();
    });

    it('should apply quote formatting', () => {
      const emitSpy = jest.spyOn(component.valueChange, 'emit');
      component.applyFormat('quote');
      const result = component.internalValue();
      expect(result).toContain('> ');
      expect(emitSpy).toHaveBeenCalled();
    });

    it('should apply link formatting', () => {
      const emitSpy = jest.spyOn(component.valueChange, 'emit');
      component.applyFormat('link');
      const result = component.internalValue();
      expect(result).toContain('[');
      expect(result).toContain('](url)');
      expect(emitSpy).toHaveBeenCalled();
    });

    it('should not emit for invalid format', () => {
      const emitSpy = jest.spyOn(component.valueChange, 'emit');
      component.applyFormat('invalid');
      expect(emitSpy).not.toHaveBeenCalled();
    });
  });

  describe('Toggle and Clear Methods', () => {
    it('should toggle formatting visibility', () => {
      expect(component.showFormatting()).toBe(false);
      component.toggleFormatting();
      expect(component.showFormatting()).toBe(true);
      component.toggleFormatting();
      expect(component.showFormatting()).toBe(false);
    });

    it('should clear text', () => {
      component.internalValue.set('Hello world');
      const emitSpy = jest.spyOn(component.valueChange, 'emit');
      component.clearText();
      expect(component.internalValue()).toBe('');
      expect(emitSpy).toHaveBeenCalledWith('');
    });
  });

  describe('Send Message', () => {
    it('should emit sendMessage with files when text is not empty', () => {
      component.internalValue.set('Hello');
      const emitSpy = jest.spyOn(component.sendMessage, 'emit');
      component.sendMsg();
      expect(emitSpy).toHaveBeenCalledWith([]);
    });

    it('should not emit sendMessage when text is empty and no files', () => {
      component.internalValue.set('');
      component.selectedFiles.set([]);
      const emitSpy = jest.spyOn(component.sendMessage, 'emit');
      component.sendMsg();
      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('should not emit sendMessage when text contains only whitespace and no files', () => {
      component.internalValue.set('   ');
      component.selectedFiles.set([]);
      const emitSpy = jest.spyOn(component.sendMessage, 'emit');
      component.sendMsg();
      expect(emitSpy).not.toHaveBeenCalled();
    });
  });

  describe('Event Handling', () => {
    it('should emit keyDown event', () => {
      const emitSpy = jest.spyOn(component.keyDown, 'emit');
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      component.onKeyDown(event);
      expect(emitSpy).toHaveBeenCalledWith(event);
    });

    it('should emit valueChange on input', () => {
      const emitSpy = jest.spyOn(component.valueChange, 'emit');
      const event = new Event('input');
      const textarea = document.createElement('textarea');
      textarea.value = 'New value';
      Object.defineProperty(event, 'target', { value: textarea });

      component.onInput(event);
      expect(emitSpy).toHaveBeenCalledWith('New value');
    });
  });

  describe('UI Rendering', () => {
    it('should render textarea element', () => {
      const textarea = fixture.nativeElement.querySelector('textarea');
      expect(textarea).toBeTruthy();
    });

    it('should render format toggle button', () => {
      const button = fixture.nativeElement.querySelector('.format-toggle');
      expect(button).toBeTruthy();
    });

    it('should render stats bar with char and word counts', () => {
      const statsBar = fixture.nativeElement.querySelector('.stats-bar');
      expect(statsBar).toBeTruthy();
    });

    it('should show format options when showFormatting is true', async () => {
      component.showFormatting.set(true);
      fixture.detectChanges();
      await fixture.whenStable();
      const formatOptions = fixture.nativeElement.querySelector('.format-options');
      expect(formatOptions).toBeTruthy();
    });

    it('should hide format options when showFormatting is false', () => {
      component.showFormatting.set(false);
      fixture.detectChanges();
      const formatOptions = fixture.nativeElement.querySelector('.format-options');
      expect(formatOptions).toBeFalsy();
    });

    it('should disable textarea when disabled input is true', () => {
      component.disabled = true;
      fixture.detectChanges();
      const textarea = fixture.nativeElement.querySelector('textarea');
      expect(textarea.disabled).toBe(true);
    });

    it('should disable send button when text is empty', () => {
      component.internalValue.set('');
      fixture.detectChanges();
      const sendButton = fixture.nativeElement.querySelector('.send-btn');
      expect(sendButton.disabled).toBe(true);
    });

    it('should enable send button when text is not empty', () => {
      component.internalValue.set('Hello');
      fixture.detectChanges();
      const sendButton = fixture.nativeElement.querySelector('.send-btn');
      expect(sendButton.disabled).toBe(false);
    });
  });

  describe('Accessibility', () => {
    it('should have aria-label on format toggle button', () => {
      const button = fixture.nativeElement.querySelector('.format-toggle');
      expect(button.getAttribute('aria-label')).toBe('Toggle formatting options');
    });

    it('should have aria-label on send button', () => {
      const button = fixture.nativeElement.querySelector('.send-btn');
      expect(button.getAttribute('aria-label')).toBe('Send message');
    });

    it('should have placeholder on textarea', () => {
      component.placeholder = 'Enter message...';
      fixture.detectChanges();
      const textarea = fixture.nativeElement.querySelector('textarea');
      expect(textarea.getAttribute('placeholder')).toBe('Enter message...');
    });
  });
});
