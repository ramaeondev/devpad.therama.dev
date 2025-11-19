import { Component, Input, Output, EventEmitter, signal, computed, inject, ViewChild, ElementRef } from '@angular/core';
import { SupabaseService } from '../../../../core/services/supabase.service';
import { ToastService } from '../../../../core/services/toast.service';
import { CommonModule } from '@angular/common';
import { marked } from 'marked';
import { IconComponent } from '../../../../shared/components/ui/icon/icon.component';

@Component({
  selector: 'app-markdown-editor',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './markdown-editor.component.html',
  styleUrls: ['./markdown-editor.component.scss'],

})
export class MarkdownEditorComponent {
  private _initial = '';
  @Input()
  set initialContent(v: string) {
    this._initial = v || '';
    // update internal signal whenever input changes
    this._content.set(this._initial);
  }
  get initialContent() {
    return this._initial;
  }
  @Output() contentChange = new EventEmitter<string>();
  /** If provided, used to upload pasted images */
  @Input() userId?: string;
  /** If provided, used to upload pasted images into a note-specific folder */
  private _noteId?: string;
  @Input()
  set noteId(val: string | undefined) {
    this._noteId = val;
  }
  get noteId() {
    return this._noteId;
  }
  /** Emitted after a pasted image is uploaded. Parent can use this to persist/replace temporary URLs */
  @Output() imagePasted = new EventEmitter<{ storagePath: string; signedUrl: string; placeholder: string }>();
  /** Emitted when an image is pasted but noteId is missing; parent should create note and upload the file */
  @Output() imageUploadRequested = new EventEmitter<{ file: File; placeholderToken: string; placeholderMarkdown: string }>();
  /** Number of active uploads */
  uploadingCount = signal(0);
  /** Mapping from storage path -> signed url */
  storageUrlMap = signal<Record<string, string>>({});
  private _content = signal('');
  preview = signal(false);
  content = this._content.asReadonly();
  
  @ViewChild('textarea', { static: false }) textareaRef?: ElementRef<HTMLTextAreaElement>;

  private supabase = inject(SupabaseService);
  private toast = inject(ToastService);

  ngOnInit() {
    this._content.set(this.initialContent);
  }

  // Simple uuid generator for filenames
  private genId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  }

  private async uploadImageFile(file: File): Promise<{ path: string; signedUrl: string } | null> {
    console.log('uploadImageFile called');
    this.uploadingCount.update((v) => v + 1);
    try {
      if (!this.userId || !this.noteId) {
        console.error('Missing userId or noteId:', { userId: this.userId, noteId: this.noteId });
        throw new Error('Missing userId or noteId for upload');
      }
      // validate size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File size exceeds 5MB limit');
      }
      const ext = (file.name.split('.').pop() || 'png').toLowerCase();
      const id = this.genId();
      const path = `${this.userId}/${this.noteId}/images/${id}.${ext}`;
      console.log('Uploading to path:', path);
      const { error: upErr } = await this.supabase.storage.from('notes').upload(path, file, {
        upsert: true,
        contentType: file.type || `image/${ext}`,
      });
      if (upErr) {
        console.error('Upload error', upErr);
        throw upErr;
      }
      // Create a signed URL valid for 1 hour so preview can load immediately
      const { data: urlData, error: urlErr } = await this.supabase.storage.from('notes').createSignedUrl(path, 3600);
      if (urlErr || !urlData?.signedUrl) {
        console.error('Signed URL error', urlErr);
        throw urlErr || new Error('Failed to create signed URL');
      }
      return { path, signedUrl: urlData.signedUrl };
    } catch (e) {
      console.error('Image upload failed', e);
      return null;
    } finally {
      this.uploadingCount.update((v) => Math.max(0, v - 1));
    }
  }

  async handlePaste(e: ClipboardEvent) {
    const clipboard = e.clipboardData;
    if (!clipboard) {
      console.log('No clipboard data');
      return;
    }
    // Find image file in clipboard items
    const item = Array.from(clipboard.items || []).find((it) => it.type.startsWith('image'));
    if (!item) return;
    e.preventDefault();
    const file = item.getAsFile();
    if (!file) {
      console.log('Could not get file from clipboard item');
      return;
    }

    console.log('Image pasted:', file.name, file.size, 'bytes');

    // Validate size early and show toast
    if (file.size > 5 * 1024 * 1024) {
      this.toast.error('Image is too large. Max size is 5MB.');
      return;
    }

    // Get textarea from event target or ViewChild
    const ta = (e.target as HTMLTextAreaElement) || this.textareaRef?.nativeElement;
    if (!ta) {
      console.error('Could not find textarea element');
      return;
    }
    console.log('Textarea found, uploading image...');

    // Insert immediate placeholder so user gets visual feedback
    const id = this.genId();
    const placeholderToken = `upload://${id}`;
    const placeholderMarkdown = `![Uploading image...](${placeholderToken})`;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const before = ta.value.substring(0, start);
    const after = ta.value.substring(end);
    const withPlaceholder = before + placeholderMarkdown + after;
    ta.value = withPlaceholder;
    this._content.set(withPlaceholder);
    this.contentChange.emit(withPlaceholder);
    ta.selectionStart = ta.selectionEnd = start + placeholderMarkdown.length;
    ta.focus();

    // If we don't have a noteId yet, delegate upload to parent (it will create note and upload)
    // Wait for noteId to be set, up to 1s
    let waited = 0;
    while (!this.noteId && waited < 1000) {
      await new Promise(res => setTimeout(res, 50));
      waited += 50;
    }
    if (!this.noteId) {
      console.log('No noteId after waiting, delegating upload to parent');
      this.imageUploadRequested.emit({ file, placeholderToken, placeholderMarkdown });
      return;
    }

    console.log('Starting upload with noteId:', this.noteId, 'userId:', this.userId);

    // Begin upload in background and replace placeholder when done
    try {
      const result = await this.uploadImageFile(file);
      if (!result) throw new Error('Upload failed');
      // Replace placeholder token in the current textarea value
      const newValue = ta.value.replace(placeholderToken, result.signedUrl);
      ta.value = newValue;
      this._content.set(newValue);
      this.contentChange.emit(newValue);
      // Emit event with storage path so parent can persist a durable reference
      this.imagePasted.emit({ storagePath: result.path, signedUrl: result.signedUrl, placeholder: placeholderToken });
    } catch (err: any) {
      console.error('handlePaste upload error', err);
      // Replace placeholder with an error note
      const errorText = '[Image upload failed]';
      const newValue = ta.value.replace(placeholderMarkdown, errorText);
      ta.value = newValue;
      this._content.set(newValue);
      this.contentChange.emit(newValue);
      this.toast.error(err?.message || 'Failed to upload image');
    }
  }

  // Public API for parent to replace a placeholder token with a real URL
  replacePlaceholderToken(token: string, replacement: string) {
    const ta = this.getTextarea();
    if (!ta) return;
    ta.value = ta.value.replace(token, replacement);
    this._content.set(ta.value);
    this.contentChange.emit(ta.value);
  }

  // Resolve storage:// links to signed URLs for preview rendering
  private async resolveStorageLinks(content: string) {
    // find storage://notes/<path> occurrences
    const regex = /storage:\/\/notes\/(\S+)/g;
    let match: RegExpExecArray | null;
    const toResolve: string[] = [];
    while ((match = regex.exec(content)) !== null) {
      const path = match[1];
      const map = this.storageUrlMap();
      if (!map[path]) toResolve.push(path);
    }
    if (toResolve.length === 0) return;
    for (const path of toResolve) {
      try {
        const { data, error } = await this.supabase.storage.from('notes').createSignedUrl(path, 3600);
          if (!error && data?.signedUrl) {
            this.storageUrlMap.update((prev) => ({ ...prev, [path]: data.signedUrl }));
          }
      } catch (e) {
        console.error('Failed to resolve storage link', path, e);
      }
    }
  }

    rendered = computed(() => {
      const raw = this._content();
      // kick off async resolution of any storage:// links (non-blocking)
      void this.resolveStorageLinks(raw);
      const map = this.storageUrlMap();
      const md = raw.replace(/storage:\/\/notes\/(\S+)/g, (_m, p) => map[p] ?? `storage://${p}`);
      return marked.parse(md);
    });

  onInput(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    this._content.set(target.value);
    this.contentChange.emit(target.value);
  }
  togglePreview() {
    this.preview.update((v) => !v);
  }
  private getTextarea(): HTMLTextAreaElement | null {
    return this.textareaRef?.nativeElement || null;
  }
  wrapSelection(before: string, after: string) {
    const ta = this.getTextarea();
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = ta.value.substring(start, end);
    const newText =
      ta.value.substring(0, start) + before + selected + after + ta.value.substring(end);
    ta.value = newText;
    this._content.set(newText);
    this.contentChange.emit(newText);
    ta.selectionStart = start + before.length;
    ta.selectionEnd = end + before.length;
    ta.focus();
  }
  prependLine(prefix: string) {
    const ta = this.getTextarea();
    if (!ta) return;
    const start = ta.selectionStart;
    const lineStart = ta.value.lastIndexOf('\n', start - 1) + 1;
    const newText = ta.value.substring(0, lineStart) + prefix + ta.value.substring(lineStart);
    ta.value = newText;
    this._content.set(newText);
    this.contentChange.emit(newText);
    ta.focus();
  }
  insertLink() {
    this.wrapSelection('[', '](https://)');
  }
  insertImage() {
    this.wrapSelection('![', '](https://)');
  }
  insertCodeBlock() {
    this.wrapSelection('```\n', '\n```');
  }
  insertInlineCode() {
    this.wrapSelection('`', '`');
  }
  handleTab(e: Event) {
    const ta = e.target as HTMLTextAreaElement;
    e.preventDefault();
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const newText = ta.value.substring(0, start) + '  ' + ta.value.substring(end);
    ta.value = newText;
    this._content.set(newText);
    this.contentChange.emit(newText);
    ta.selectionStart = ta.selectionEnd = start + 2;
  }
  syncScroll(e: Event) {
    if (!this.preview()) return;
    const ta = e.target as HTMLTextAreaElement;
    const previewEl = ta
      .closest('app-markdown-editor')
      ?.querySelector('.prose') as HTMLElement | null;
    if (previewEl) previewEl.scrollTop = (ta.scrollTop / ta.scrollHeight) * previewEl.scrollHeight;
  }
}
