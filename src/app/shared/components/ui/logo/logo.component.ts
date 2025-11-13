import { Component, Input } from '@angular/core';
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
  /** Duration of typing animation, accepts CSS time value (default: 1.8s) */
  @Input() speed = '1.8s';

  ngOnInit(): void {
    // Set CSS variables dynamically based on input text / speed
    const host = (document.currentScript as unknown) as HTMLElement | null;
    // We'll set variables on the component root element after it's instantiated
    // but we can't access the host element directly in a static way here.
    // Consumers can override variables via inline style. To apply defaults, set on document in microtask.
    queueMicrotask(() => {
      const el = document.querySelector('app-logo:last-of-type') as HTMLElement | null;
      if (el) {
        el.style.setProperty('--speed', this.speed);
        el.style.setProperty('--steps', String(Math.max(1, this.text.length)));
        el.style.setProperty('--chars', String(Math.max(1, this.text.length)));
        // add animate class to start animation
        el.classList.add('animate');
      }
    });
  }
}
