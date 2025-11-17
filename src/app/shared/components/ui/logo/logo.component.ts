import { Component, Input, AfterViewInit, ElementRef, Renderer2, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-logo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span *ngFor="let letter of letters" [class.hidden]="!letter.visible">
      {{ letter.char }}
    </span>
    <span *ngIf="showCursor" class="animate-blink">|</span>
  `,
  styles: [
    `
      :host {
        display: inline-block;
        font-size: 1.5rem;
        font-weight: 700;
        letter-spacing: -0.025em;
        color: inherit;
      }

      @keyframes blink {
        0%,
        50% {
          opacity: 1;
        }
        51%,
        100% {
          opacity: 0;
        }
      }

      .animate-blink {
        animation: blink 0.8s infinite;
      }

      .hidden {
        visibility: hidden;
      }
    `,
  ],
})
export class LogoComponent implements OnInit {
  @Input() text = 'DevPad';
  @Input() speed: number = 200;
  @Input() showCursor = false;
  letters: Array<{ char: string; visible: boolean; delay: number }> = [];

  ngOnInit() {
    this.initializeLetters();
    this.typeText();
  }

  initializeLetters() {
    this.letters = this.text.split('').map((char, index) => ({
      char,
      visible: false,
      delay: 0,
    }));
  }

  typeText() {
    this.letters.forEach((letter, index) => {
      setTimeout(() => {
        letter.visible = true;

        // Show and start blinking cursor after last letter
        if (index === this.letters.length - 1) {
          setTimeout(() => {
            this.showCursor = true;
          }, 100);
        }
      }, index * this.speed);
    });
  }
}
