import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FileAttachmentInputComponent } from '../file-attachment-input/file-attachment-input.component';
import { FileMetadata } from '../../models/file-attachment.model';

@Component({
  selector: 'app-rich-textarea',
  standalone: true,
  imports: [CommonModule, FormsModule, FileAttachmentInputComponent],
  templateUrl: './rich-textarea.component.html',
  styleUrls: ['./rich-textarea.component.scss'],
})
export class RichTextareaComponent {
  @Input() placeholder: string = 'TYPE YOUR MESSAGE...';
  @Input() disabled: boolean = false;
  @Input() rows: number = 2;
  @Input() set value(val: string) {
    this.internalValue.set(val);
  }
  @Output() valueChange = new EventEmitter<string>();
  @Output() sendMessage = new EventEmitter<FileMetadata[]>();
  @Output() fileAttachmentsSelected = new EventEmitter<FileMetadata[]>();
  @Output() keyDown = new EventEmitter<KeyboardEvent>();

  @ViewChild('textarea') textareaRef!: ElementRef<HTMLTextAreaElement>;

  internalValue = signal<string>('');
  showFormatting = signal<boolean>(false);
  showFileUploader = signal<boolean>(false);
  selectedFormat = signal<string>('');
  selectedFiles = signal<FileMetadata[]>([]);

  rowCount = computed(() => {
    const lines = this.internalValue().split('\n').length;
    return Math.max(this.rows, Math.min(lines, 6));
  });

  charCount = computed(() => this.internalValue().length);
  wordCount = computed(() => {
    const text = this.internalValue().trim();
    return text ? text.split(/\s+/).length : 0;
  });

  isSendEnabled = computed(() => {
    return this.internalValue().trim().length > 0 || this.selectedFiles().length > 0;
  });

  onInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.internalValue.set(target.value);
    this.valueChange.emit(target.value);
  }

  onKeyDown(event: KeyboardEvent): void {
    this.keyDown.emit(event);
  }

  applyFormat(format: string): void {
    const textarea = this.textareaRef?.nativeElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = this.internalValue().substring(start, end) || 'text';
    const currentValue = this.internalValue();

    let formattedText = '';
    switch (format) {
      case 'bold':
        formattedText = `**${selectedText}**`;
        break;
      case 'italic':
        formattedText = `*${selectedText}*`;
        break;
      case 'underline':
        formattedText = `__${selectedText}__`;
        break;
      case 'strikethrough':
        formattedText = `~~${selectedText}~~`;
        break;
      case 'code':
        formattedText = `\`${selectedText}\``;
        break;
      case 'codeblock':
        formattedText = `\`\`\`\n${selectedText}\n\`\`\``;
        break;
      case 'quote':
        formattedText = `> ${selectedText}`;
        break;
      case 'link':
        formattedText = `[${selectedText}](url)`;
        break;
      default:
        return;
    }

    const newValue = currentValue.substring(0, start) + formattedText + currentValue.substring(end);
    this.internalValue.set(newValue);
    this.valueChange.emit(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = start + formattedText.length;
      textarea.selectionEnd = start + formattedText.length;
    }, 0);
  }

  toggleFormatting(): void {
    this.showFormatting.update((v) => !v);
  }

  toggleFileUploader(): void {
    this.showFileUploader.update((v) => !v);
  }

  clearText(): void {
    this.internalValue.set('');
    this.valueChange.emit('');
  }

  sendMsg(): void {
    if (this.isSendEnabled()) {
      this.sendMessage.emit(this.selectedFiles());
    }
  }

  onFilesSelected(files: FileMetadata[]): void {
    this.selectedFiles.set(files);
    this.fileAttachmentsSelected.emit(files);
  }

  getSelectedFilesCount(): number {
    return this.selectedFiles().length;
  }

  /**
   * Reset all input fields (text, files, formatting)
   */
  reset(): void {
    this.clearText();
    this.selectedFiles.set([]);
    this.showFormatting.set(false);
    this.showFileUploader.set(false);
    this.selectedFormat.set('');
  }
}
