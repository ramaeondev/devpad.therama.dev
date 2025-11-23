import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-logo',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
  @if(isClickable) {
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
