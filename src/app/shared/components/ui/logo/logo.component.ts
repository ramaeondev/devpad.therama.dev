import { Component, Input } from '@angular/core';

import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-logo',
  standalone: true,
  imports: [RouterModule],
  template: `
    @if (isClickable) {
      <a routerLink="/">
        <span class="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">DevPad</span>
      </a>
    } @else {
      <span class="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">DevPad</span>
    }
  `,
  styles: [],
})
export class LogoComponent {
  @Input() isClickable: boolean = false;
}
