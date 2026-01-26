/**
 * Markdown Formatter Utility
 * Converts markdown syntax to HTML for display in chat messages
 * Supports: bold, italic, underline, strikethrough, code, codeblock, quote, link
 */

export interface FormattedSegment {
  type: 'text' | 'bold' | 'italic' | 'underline' | 'strikethrough' | 'code' | 'codeblock' | 'quote' | 'link' | 'image' | 'pdf' | 'document';
  content: string;
  url?: string;
}

export class MarkdownFormatter {
  /**
   * Parse markdown text and return formatted segments
   */
  static parse(text: string): FormattedSegment[] {
    if (!text) return [];

    const segments: FormattedSegment[] = [];

    // Process line by line for block elements
    const lines = text.split('\n');
    
    for (const line of lines) {
      if (!line.trim()) {
        segments.push({ type: 'text', content: '\n' });
        continue;
      }

      // Check for code block (```...```)
      if (line.trim().startsWith('```')) {
        const codeMatch = /```[\s\S]*?```/.exec(text);
        if (codeMatch) {
          const codeContent = codeMatch[0]
            .replace(/^```\n?/, '')
            .replace(/\n?```$/, '');
          segments.push({ type: 'codeblock', content: codeContent });
          continue;
        }
      }

      // Check for quote (> ...)
      if (line.trim().startsWith('>')) {
        const quoteContent = line.replace(/^>\s?/, '');
        segments.push({ type: 'quote', content: quoteContent });
        continue;
      }

      // Parse inline formatting in the line
      this.parseInlineFormatting(line).forEach(seg => segments.push(seg));
      segments.push({ type: 'text', content: '\n' });
    }

    return segments;
  }

  /**
   * Parse inline formatting in a line of text
   */
  private static parseInlineFormatting(text: string): FormattedSegment[] {
    const segments: FormattedSegment[] = [];

    // Regex patterns for inline formatting
    const patterns = [
      { regex: /\*\*(.+?)\*\*/, type: 'bold' as const },
      { regex: /\*(.+?)\*/, type: 'italic' as const },
      { regex: /__(.+?)__/, type: 'underline' as const },
      { regex: /~~(.+?)~~/, type: 'strikethrough' as const },
      { regex: /`([^`]+)`/, type: 'code' as const },
      { regex: /\[(.+?)\]\((.+?)\)/, type: 'link' as const },
      { regex: /!\[(.+?)\]\((.+?)\)/, type: 'image' as const },
    ];

    // Find all matches and sort by position
    interface Match {
      regex: RegExp;
      type: string;
      match: RegExpMatchArray | null;
      index: number;
      length: number;
    }

    const matches: Match[] = [];

    for (const pattern of patterns) {
      const regex = new RegExp(pattern.regex, 'g');
      let match;
      while ((match = regex.exec(text)) !== null) {
        matches.push({
          regex: pattern.regex,
          type: pattern.type,
          match,
          index: match.index,
          length: match[0].length,
        });
      }
    }

    // Sort matches by index
    matches.sort((a, b) => a.index - b.index);

    // Process matches and build segments
    let currentIndex = 0;

    for (const matchItem of matches) {
      const { match, type, index, length } = matchItem;

      // Add text before the match
      if (currentIndex < index) {
        segments.push({
          type: 'text',
          content: text.substring(currentIndex, index),
        });
      }

      // Add the formatted segment
      if (type === 'link') {
        segments.push({
          type: 'link',
          content: match![1],
          url: match![2],
        });
      } else if (type === 'image') {
        segments.push({
          type: 'image',
          content: match![1],
          url: match![2],
        });
      } else {
        segments.push({
          type: type as any,
          content: match![1],
        });
      }

      currentIndex = index + length;
    }

    // Add remaining text
    if (currentIndex < text.length) {
      segments.push({
        type: 'text',
        content: text.substring(currentIndex),
      });
    }

    return segments.length > 0 ? segments : [{ type: 'text', content: text }];
  }

  /**
   * Check if content contains media
   */
  static detectMedia(content: string): {
    hasImages: boolean;
    hasPDFs: boolean;
    hasDocuments: boolean;
  } {
    return {
      hasImages: /!\[.+?\]\(.+?\.(jpg|jpeg|png|gif|webp)\)/i.test(content),
      hasPDFs: /!\[.+?\]\(.+?\.pdf\)/i.test(content),
      hasDocuments: /!\[.+?\]\(.+?\.(doc|docx|txt|xls|xlsx)\)/i.test(content),
    };
  }

  /**
   * Get HTML class for formatted text
   */
  static getClass(type: FormattedSegment['type']): string {
    const classes: Record<string, string> = {
      text: '',
      bold: 'font-bold',
      italic: 'italic',
      underline: 'underline',
      strikethrough: 'line-through',
      code: 'bg-gray-800 px-1 py-0.5 rounded text-retro-green font-mono text-xs',
      codeblock: 'bg-gray-800 p-2 rounded block font-mono text-xs text-retro-green my-1 overflow-x-auto',
      quote: 'border-l-2 border-retro-green pl-2 italic opacity-75',
      link: 'text-retro-green underline hover:opacity-75 cursor-pointer',
      image: 'block my-2 max-w-xs',
      pdf: 'block my-2',
      document: 'block my-2',
    };
    return classes[type] || '';
  }

  /**
   * Get HTML tag for formatted text
   */
  static getTag(type: FormattedSegment['type']): string {
    const tags: Record<string, string> = {
      text: 'span',
      bold: 'strong',
      italic: 'em',
      underline: 'u',
      strikethrough: 's',
      code: 'code',
      codeblock: 'pre',
      quote: 'blockquote',
      link: 'a',
      image: 'img',
      pdf: 'div',
      document: 'div',
    };
    return tags[type] || 'span';
  }

  /**
   * Format a message for display
   * Returns HTML-safe formatted content
   */
  static format(text: string): string {
    if (!text) return '';

    const formatted = text
      // Bold: **text** → <strong>text</strong>
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Italic: *text* → <em>text</em>
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Underline: __text__ → <u>text</u>
      .replace(/__(.+?)__/g, '<u>$1</u>')
      // Strikethrough: ~~text~~ → <s>text</s>
      .replace(/~~(.+?)~~/g, '<s>$1</s>')
      // Code block: ```code``` → <pre><code>code</code></pre>
      .replace(/```\n?([\s\S]*?)\n?```/g, '<pre class="bg-gray-800 p-2 rounded font-mono text-xs text-retro-green overflow-x-auto my-1"><code>$1</code></pre>')
      // Inline code: `code` → <code>code</code>
      .replace(/`([^`]+)`/g, '<code class="bg-gray-800 px-1 py-0.5 rounded text-retro-green font-mono text-xs">$1</code>')
      // Quote: > text → <blockquote>text</blockquote>
      .replace(/^> (.+)$/gm, '<blockquote class="border-l-2 border-retro-green pl-2 italic opacity-75">$1</blockquote>')
      // Links: [text](url) → <a href="url">text</a>
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" class="text-retro-green underline hover:opacity-75">$1</a>')
      // Preserve line breaks
      .replace(/\n/g, '<br>');

    return formatted;
  }
}

/**
 * Detect message type/content
 */
export function detectMessageType(content: string): 'text' | 'formatted' | 'code' | 'quote' | 'mixed' {
  const hasCodeBlock = /```/.test(content);
  const hasQuote = /^> /m.test(content);
  // Check for common formatting markers
  const hasFormatting = /\*\*|~~|__|\[.+?\]\(|`/.test(content);

  if (hasCodeBlock) return 'code';
  if (hasQuote && !hasFormatting) return 'quote';
  if (hasFormatting) return 'formatted';
  return 'text';
}

/**
 * Get file type from URL
 */
export function getFileType(url: string): 'image' | 'pdf' | 'document' | 'unknown' {
  const extension = url.split('.').pop()?.toLowerCase() || '';

  if (/jpg|jpeg|png|gif|webp|svg/.test(extension)) return 'image';
  if (/pdf/.test(extension)) return 'pdf';
  if (/doc|docx|txt|xls|xlsx|ppt|pptx/.test(extension)) return 'document';

  return 'unknown';
}
