import { Component, Input, AfterViewInit, ElementRef, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-logo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="logo" [attr.aria-label]="text">
      <span class="typewriter">
        <span class="text">{{ text }}</span>
        <span class="caret" aria-hidden="true">▌</span>
      </span>
    </div>
  `,
  styles: [
    `:host { display: inline-block; }
    .logo { display: inline-block; }
    .typewriter { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, 'Courier New', monospace; font-weight: 600; color: var(--logo-color, #1f2937); font-size: 1.15rem; display: inline-flex; align-items: center; }
    .text { display: inline-block; overflow: hidden; white-space: nowrap; /* make width animate */ width: 0ch; }
    .caret { display: inline-block; margin-left: 0.2rem; color: var(--logo-color, #1f2937); opacity: 1; }

    /* Typing animation uses steps matching chars */
    @keyframes typing { from { width: 0ch; } to { width: var(--chars, 6)ch; } }
    @keyframes blink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }

    /* Expose CSS variables for speed and character count via style binding or component defaults */
    :host(.animate) .text { animation: typing var(--speed, 1.8s) steps(var(--steps, 6), end) 0s forwards; }
    :host(.animate) .caret { animation: blink 1s step-end infinite; }

    /* small responsive sizing */
    @media (min-width: 768px) {
      .typewriter { font-size: 1.25rem; }
    }
    `
  ]
})
export class LogoComponent {
  /** Text to type (default: DevPad) */
  @Input() text = 'DevPad';
  /** Duration of typing animation, accepts CSS time value (default: 3.5s) */
  @Input() speed = '3.5s';
  /** Animation mode: 'once' -> animate once then become static (default), 'always' -> keep animating, false -> never animate */
  @Input() animate: 'once' | 'always' | false = 'once';
  /** If true, persist that the animation has been shown for this text and skip on subsequent visits */
  @Input() persist = true;
  /** Optional custom localStorage key to persist the shown flag */
  @Input() persistKey?: string;

  constructor(private el: ElementRef<HTMLElement>, private renderer: Renderer2) {}
  ngAfterViewInit(): void {
    // Set CSS variables on host element
    const hostEl = this.el.nativeElement;
    this.renderer.setStyle(hostEl, '--speed', this.speed);
    this.renderer.setStyle(hostEl, '--steps', String(Math.max(1, this.text.length)));
    this.renderer.setStyle(hostEl, '--chars', String(Math.max(1, this.text.length)));

    const textEl = hostEl.querySelector('.text') as HTMLElement | null;
    const caretEl = hostEl.querySelector('.caret') as HTMLElement | null;

    // Determine persistence key
    const storageAvailable = typeof window !== 'undefined' && !!window.localStorage;
    const key = this.persistKey || `devpad.logo.shown:${this.text}`;

    if (this.animate === false) {
      // never animate: ensure text visible and caret hidden
      if (textEl) this.renderer.setStyle(textEl, 'width', 'auto');
      if (caretEl) this.renderer.setStyle(caretEl, 'display', 'none');
      return;
    }
    // If persistence requested and already shown, render static immediately
    if (this.persist && storageAvailable && window.localStorage.getItem(key)) {
      if (textEl) this.renderer.setStyle(textEl, 'width', 'auto');
      if (caretEl) this.renderer.setStyle(caretEl, 'display', 'none');
      return;
    }

    // Start animation (either once or always)
    this.renderer.addClass(hostEl, 'animate');

    if (this.animate === 'once') {
      // After typing animation completes, stop animating and leave static text + no caret
      const onAnimEnd = (ev: AnimationEvent) => {
        // Only react to typing animation ending on the .text element
        if (ev.animationName === 'typing') {
          this.renderer.removeClass(hostEl, 'animate');
          if (textEl) this.renderer.setStyle(textEl, 'width', 'auto');
          if (caretEl) this.renderer.setStyle(caretEl, 'display', 'none');
          textEl?.removeEventListener('animationend', onAnimEnd as any);
          // Persist that we've shown the animation
          try {
            if (this.persist && storageAvailable) {
              window.localStorage.setItem(key, '1');
            }
          } catch (err) {
            // ignore storage errors
          }
        }
      };
      textEl?.addEventListener('animationend', onAnimEnd as any);
    }
    // if 'always', leave animate class so caret keeps blinking and typing repeats per CSS if desired
  }
}
