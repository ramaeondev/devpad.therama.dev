import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { marked } from 'marked';

@Component({
  selector: 'app-markdown-editor',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col gap-4">
      <ng-content select="[editor-header]"></ng-content>
      <div class="flex flex-wrap gap-2 items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2">
        <button type="button" class="toolbar-btn" (click)="wrapSelection('**','**')" title="Bold"><strong>B</strong></button>
        <button type="button" class="toolbar-btn italic" (click)="wrapSelection('*','*')" title="Italic">I</button>
        <button type="button" class="toolbar-btn" (click)="prependLine('# ')" title="H1">H1</button>
        <button type="button" class="toolbar-btn" (click)="prependLine('## ')" title="H2">H2</button>
        <button type="button" class="toolbar-btn" (click)="prependLine('### ')" title="H3">H3</button>
  <button type="button" class="toolbar-btn" (click)="insertInlineCode()" title="Inline Code">&lt;/&gt;</button>
        <button type="button" class="toolbar-btn" (click)="insertCodeBlock()" title="Code Block">Code</button>
        <button type="button" class="toolbar-btn" (click)="prependLine('- ')" title="Bullet List">• List</button>
        <button type="button" class="toolbar-btn" (click)="insertLink()" title="Link">Link</button>
        <button type="button" class="toolbar-btn" (click)="insertImage()" title="Image">Img</button>
        <button type="button" class="ml-auto toolbar-btn" (click)="togglePreview()" [class.bg-primary-600]="preview()" title="Toggle Preview">{{ preview() ? 'Edit' : 'Preview' }}</button>
      </div>
      <div class="grid gap-4" [class.md:grid-cols-2]="preview()">
        <div class="flex flex-col">
          <textarea
            #textarea
            class="flex-1 min-h-[50vh] resize-y w-full font-mono text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md p-3 leading-5 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            [value]="content()"
            (input)="onInput($event)"
            (keydown.tab)="handleTab($event)"
            (scroll)="syncScroll($event)"
          ></textarea>
        </div>
        @if (preview()) {
          <div class="prose dark:prose-invert max-w-none overflow-auto border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 p-4" [innerHTML]="rendered()"></div>
        }
      </div>
    </div>
  `,
  styles: [`
    .toolbar-btn { @apply px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-600 transition; }
    textarea::-webkit-scrollbar { width: 8px; }
    textarea::-webkit-scrollbar-thumb { @apply bg-gray-300 dark:bg-gray-600 rounded; }
  `]
})
export class MarkdownEditorComponent {
  private _initial = '';
  @Input()
  set initialContent(v: string) {
    this._initial = v || '';
    // update internal signal whenever input changes
    this._content.set(this._initial);
  }
  get initialContent() { return this._initial; }
  @Output() contentChange = new EventEmitter<string>();
  private _content = signal('');
  preview = signal(false);
  content = this._content.asReadonly();

  ngOnInit() { this._content.set(this.initialContent); }

  rendered = computed(() => marked.parse(this._content()));

  onInput(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    this._content.set(target.value);
    this.contentChange.emit(target.value);
  }
  togglePreview() { this.preview.update(v => !v); }
  private getTextarea(): HTMLTextAreaElement | null { return document.querySelector('app-markdown-editor textarea'); }
  wrapSelection(before: string, after: string) {
    const ta = this.getTextarea(); if (!ta) return;
    const start = ta.selectionStart; const end = ta.selectionEnd;
    const selected = ta.value.substring(start, end);
    const newText = ta.value.substring(0, start) + before + selected + after + ta.value.substring(end);
    ta.value = newText; this._content.set(newText); this.contentChange.emit(newText);
    ta.selectionStart = start + before.length; ta.selectionEnd = end + before.length; ta.focus();
  }
  prependLine(prefix: string) {
    const ta = this.getTextarea(); if (!ta) return;
    const start = ta.selectionStart; const lineStart = ta.value.lastIndexOf('\n', start - 1) + 1;
    const newText = ta.value.substring(0, lineStart) + prefix + ta.value.substring(lineStart);
    ta.value = newText; this._content.set(newText); this.contentChange.emit(newText); ta.focus();
  }
  insertLink() { this.wrapSelection('[', '](https://)'); }
  insertImage() { this.wrapSelection('![', '](https://)'); }
  insertCodeBlock() { this.wrapSelection('```\n', '\n```'); }
  insertInlineCode() { this.wrapSelection('`', '`'); }
  handleTab(e: Event) {
    const ta = e.target as HTMLTextAreaElement; e.preventDefault();
    const start = ta.selectionStart; const end = ta.selectionEnd;
    const newText = ta.value.substring(0, start) + '  ' + ta.value.substring(end);
    ta.value = newText; this._content.set(newText); this.contentChange.emit(newText);
    ta.selectionStart = ta.selectionEnd = start + 2;
  }
  syncScroll(e: Event) {
    if (!this.preview()) return;
    const ta = e.target as HTMLTextAreaElement;
    const previewEl = ta.closest('app-markdown-editor')?.querySelector('.prose') as HTMLElement | null;
    if (previewEl) previewEl.scrollTop = (ta.scrollTop / ta.scrollHeight) * previewEl.scrollHeight;
  }
}
