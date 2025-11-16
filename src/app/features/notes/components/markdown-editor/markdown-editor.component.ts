import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { marked } from 'marked';

@Component({
  selector: 'app-markdown-editor',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col gap-3 sm:gap-4">
      <ng-content select="[editor-header]"></ng-content>
      <!-- Toolbar with horizontal scrolling on mobile -->
      <div class="flex gap-2 items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-2 sm:px-3 py-2 overflow-x-auto scrollbar-thin">
        <button type="button" class="toolbar-btn flex-shrink-0" (click)="wrapSelection('**','**')" title="Bold"><strong>B</strong></button>
        <button type="button" class="toolbar-btn italic flex-shrink-0" (click)="wrapSelection('*','*')" title="Italic">I</button>
        <button type="button" class="toolbar-btn flex-shrink-0" (click)="prependLine('# ')" title="H1">H1</button>
        <button type="button" class="toolbar-btn flex-shrink-0" (click)="prependLine('## ')" title="H2">H2</button>
        <button type="button" class="toolbar-btn flex-shrink-0" (click)="prependLine('### ')" title="H3">H3</button>
        <button type="button" class="toolbar-btn flex-shrink-0" (click)="insertInlineCode()" title="Inline Code">&lt;/&gt;</button>
        <button type="button" class="toolbar-btn flex-shrink-0" (click)="insertCodeBlock()" title="Code Block">Code</button>
        <button type="button" class="toolbar-btn flex-shrink-0" (click)="prependLine('- ')" title="Bullet List">• List</button>
        <button type="button" class="toolbar-btn flex-shrink-0" (click)="insertLink()" title="Link">Link</button>
        <button type="button" class="toolbar-btn flex-shrink-0" (click)="insertImage()" title="Image">Img</button>
        <div class="flex-1 min-w-[16px]"></div>
        <button type="button" class="toolbar-btn flex-shrink-0" (click)="togglePreview()" [class.bg-primary-600]="preview()" [class.text-white]="preview()" title="Toggle Preview">
          <span class="hidden sm:inline">{{ preview() ? 'Edit' : 'Preview' }}</span>
          <span class="sm:hidden">
            @if (preview()) {
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
            } @else {
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
            }
          </span>
        </button>
      </div>
      <!-- Editor/Preview area - toggle on mobile, side-by-side on desktop when preview active -->
      <div class="grid gap-3 sm:gap-4" [class.lg:grid-cols-2]="preview()">
        <!-- Editor - hidden on mobile when preview active, always shown on desktop -->
        <div class="flex flex-col" [class.hidden]="preview()" [class.lg:block]="preview()">
          <textarea
            #textarea
            class="flex-1 min-h-[40vh] sm:min-h-[50vh] resize-y w-full font-mono text-xs sm:text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md p-3 sm:p-4 leading-relaxed text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 touch-manipulation"
            [value]="content()"
            (input)="onInput($event)"
            (keydown.tab)="handleTab($event)"
            (scroll)="syncScroll($event)"
          ></textarea>
        </div>
        <!-- Preview - shown when preview active -->
        @if (preview()) {
          <div class="prose prose-sm sm:prose dark:prose-invert max-w-none overflow-auto border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 p-3 sm:p-4 min-h-[40vh] sm:min-h-[50vh] touch-pan-y" [innerHTML]="rendered()"></div>
        }
      </div>
    </div>
  `,
  styles: [`
    .toolbar-btn { 
      @apply px-2.5 py-1.5 text-xs sm:text-sm rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-600 transition touch-manipulation;
      min-width: 32px;
      min-height: 32px;
    }
    .scrollbar-thin::-webkit-scrollbar { height: 6px; }
    .scrollbar-thin::-webkit-scrollbar-thumb { @apply bg-gray-300 dark:bg-gray-600 rounded; }
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
