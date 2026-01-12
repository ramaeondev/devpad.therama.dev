import { TestBed } from '@angular/core/testing';
import { MarkdownEditorComponent } from './markdown-editor.component';

jest.mock('marked', () => ({ marked: { parse: (s: string) => `<p>${s}</p>` } }));

describe('MarkdownEditorComponent', () => {
  it('initializes content and toggles preview', async () => {
    await TestBed.configureTestingModule({ imports: [MarkdownEditorComponent] }).compileComponents();
    const fixture = TestBed.createComponent(MarkdownEditorComponent);
    const comp = fixture.componentInstance;
    comp.initialContent = 'hello';
    fixture.detectChanges();
    expect(comp.content()).toBe('hello');
    expect(comp.preview()).toBe(false);
    comp.togglePreview();
    expect(comp.preview()).toBe(true);
  });

  it('wraps selection and updates content', async () => {
    await TestBed.configureTestingModule({ imports: [MarkdownEditorComponent] }).compileComponents();
    const fixture = TestBed.createComponent(MarkdownEditorComponent);
    const comp = fixture.componentInstance;
    comp.initialContent = 'hello world';
    fixture.detectChanges();

    // create a fake host with a textarea so getTextarea() finds it via document.querySelector
    const host = document.createElement('app-markdown-editor');
    const fakeTa = document.createElement('textarea');
    fakeTa.value = 'hello world';
    fakeTa.selectionStart = 0;
    fakeTa.selectionEnd = 5;
    host.appendChild(fakeTa);
    document.body.appendChild(host);
    try {
      comp.wrapSelection('**', '**');
      fixture.detectChanges();

      expect(comp.content()).toContain('**hello**');
    } finally {
      document.body.removeChild(host);
    }
  });

  it('inserts tab as two spaces on handleTab', async () => {
    await TestBed.configureTestingModule({ imports: [MarkdownEditorComponent] }).compileComponents();
    const fixture = TestBed.createComponent(MarkdownEditorComponent);
    const comp = fixture.componentInstance;
    comp.initialContent = 'x';
    fixture.detectChanges();

    const textarea = fixture.nativeElement.querySelector('textarea');
    const evt = new Event('keydown');
    Object.defineProperty(evt, 'target', { value: textarea });
    // simulate keydown tab
    comp.handleTab(evt as any);
    fixture.detectChanges();
    expect(comp.content()).toContain('  ');
  });

  it('toggles preview and renders markdown', async () => {
    await TestBed.configureTestingModule({ imports: [MarkdownEditorComponent] }).compileComponents();
    const fixture = TestBed.createComponent(MarkdownEditorComponent);
    const comp = fixture.componentInstance;
    comp.initialContent = '# Hello';
    fixture.detectChanges();

    // check underlying content signal
    expect(comp.content()).toContain('Hello');
    comp.togglePreview();
    fixture.detectChanges();
    // when preview is true, we expect rendered HTML to appear in the preview pane
    const preview = fixture.nativeElement.querySelector('.prose');
    expect(preview).toBeTruthy();
    expect(preview.innerHTML).toContain('Hello');
  });

  it('prepends line prefix at current line', async () => {
    await TestBed.configureTestingModule({ imports: [MarkdownEditorComponent] }).compileComponents();
    const fixture = TestBed.createComponent(MarkdownEditorComponent);
    const comp = fixture.componentInstance;

    // create a fake textarea and stub the component's getTextarea so behavior is deterministic
    const fakeTa = document.createElement('textarea');
    fakeTa.value = 'line1\nline2';
    fakeTa.selectionStart = 6; // start of 'line2'
    fakeTa.selectionEnd = 6;

    (comp as any).getTextarea = () => fakeTa;

    const spy = jest.fn();
    comp.contentChange.subscribe(spy);

    comp.prependLine('> ');
    fixture.detectChanges();

    expect(fakeTa.value).toContain('> line2');
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('> line2'));
  });

  it('insert helpers add correct markdown wrappers', async () => {
    await TestBed.configureTestingModule({ imports: [MarkdownEditorComponent] }).compileComponents();
    const fixture = TestBed.createComponent(MarkdownEditorComponent);
    const comp = fixture.componentInstance;

    const makeHost = () => {
      const host = document.createElement('app-markdown-editor');
      const ta = document.createElement('textarea');
      ta.value = 'hello';
      ta.selectionStart = 0;
      ta.selectionEnd = 5;
      host.appendChild(ta);
      document.body.appendChild(host);
      return { host, ta };
    };

    try {
      const { host: h1, ta: ta1 } = makeHost();
      comp.insertLink();
      expect(ta1.value).toContain('[');
      expect(ta1.value).toContain('](https://)');
      document.body.removeChild(h1);

      const { host: h2, ta: ta2 } = makeHost();
      comp.insertImage();
      expect(ta2.value).toContain('![');
      expect(ta2.value).toContain('](https://)');
      document.body.removeChild(h2);

      const { host: h3, ta: ta3 } = makeHost();
      comp.insertCodeBlock();
      expect(ta3.value).toContain('```');
      document.body.removeChild(h3);

      const { host: h4, ta: ta4 } = makeHost();
      comp.insertInlineCode();
      expect(ta4.value).toContain('`');
      document.body.removeChild(h4);
    } finally {
      // ensure cleanup in case of failures
      const remaining = document.querySelectorAll('app-markdown-editor');
      remaining.forEach((n) => n.remove());
    }
  });

  it('syncScroll adjusts preview scroll when preview active', async () => {
    await TestBed.configureTestingModule({ imports: [MarkdownEditorComponent] }).compileComponents();
    const fixture = TestBed.createComponent(MarkdownEditorComponent);
    const comp = fixture.componentInstance;

    const host = document.createElement('app-markdown-editor');
    const ta = document.createElement('textarea');
    ta.scrollTop = 50;
    Object.defineProperty(ta, 'scrollHeight', { value: 200, configurable: true });
    const preview = document.createElement('div');
    preview.className = 'prose';
    // give preview a taller scrollHeight
    Object.defineProperty(preview, 'scrollHeight', { value: 400, configurable: true });
    host.appendChild(ta);
    host.appendChild(preview);
    document.body.appendChild(host);

    try {
      comp.preview.set(true);
      comp.syncScroll({ target: ta } as unknown as Event);
      expect(preview.scrollTop).toBeCloseTo((ta.scrollTop / ta.scrollHeight) * preview.scrollHeight);
    } finally {
      document.body.removeChild(host);
    }
  });

  it('syncScroll does nothing when preview is false', async () => {
    await TestBed.configureTestingModule({ imports: [MarkdownEditorComponent] }).compileComponents();
    const fixture = TestBed.createComponent(MarkdownEditorComponent);
    const comp = fixture.componentInstance;

    const host = document.createElement('app-markdown-editor');
    const ta = document.createElement('textarea');
    ta.scrollTop = 70;
    Object.defineProperty(ta, 'scrollHeight', { value: 200, configurable: true });
    const preview = document.createElement('div');
    preview.className = 'prose';
    Object.defineProperty(preview, 'scrollHeight', { value: 400, configurable: true });
    preview.scrollTop = 123;
    host.appendChild(ta);
    host.appendChild(preview);
    document.body.appendChild(host);

    try {
      comp.preview.set(false);
      comp.syncScroll({ target: ta } as unknown as Event);
      expect(preview.scrollTop).toBe(123);
    } finally {
      document.body.removeChild(host);
    }
  });

  it('insert helpers are no-ops when no textarea is present', async () => {
    await TestBed.configureTestingModule({ imports: [MarkdownEditorComponent] }).compileComponents();
    const fixture = TestBed.createComponent(MarkdownEditorComponent);
    const comp = fixture.componentInstance;
    const spy = jest.fn();
    comp.contentChange.subscribe(spy);

    // no host/textarea appended
    comp.insertLink();
    comp.insertImage();
    comp.insertCodeBlock();
    comp.insertInlineCode();

    expect(spy).not.toHaveBeenCalled();
  });
});