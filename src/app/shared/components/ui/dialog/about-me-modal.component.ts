import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SocialLinksComponent } from '../../social-links/social-links.component';

@Component({
  selector: 'app-about-me-modal',
  standalone: true,
  imports: [CommonModule, SocialLinksComponent],
  template: `
    <div class="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div class="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">About Us</h2>
        <div class="text-sm text-gray-700 dark:text-gray-300 space-y-4">
          <p>Hi, I'm 
            <a href="https://therama.dev" target="_blank" class="text-blue-600 hover:underline">Rama</a> — I loves building high-impact web applications and sharing ideas through side projects like <code>
            <a href="https://therama.dev" target="_blank" class="text-blue-600 hover:underline">therama.dev</a></code>.</p>
          <h3 class="text-sm font-semibold">What I Do</h3>
          <ul class="list-disc pl-5">
            <li>Architect and ship performant javascript applications with clean, reusable component patterns.</li>
            <li>Mentor teams on Angular, modern React tooling, TailwindCSS flows, and frontend performance debugging.</li>
            <li>Tinker with UI motion and accessibility to make every interaction feel intentional.</li>
          </ul>
          <h3 class="text-sm font-semibold">Beyond the Keyboard</h3>
          <p>When I'm not coding, you'll probably find me outdoors, on a trip, or hanging with family and friends. I'm also into gaming, movies, cricket, tennis, cooking, photography, and spending time with my dog.</p>
          <h3 class="text-sm font-semibold mb-3">Connect</h3>
          <app-social-links></app-social-links>
          <div class="mt-4">
            <ul class="list-disc pl-5 text-sm">
              <li><a href="https://therama.dev" target="_blank" class="text-blue-600 hover:underline">therama.dev</a></li>
              <li><a href="https://apps.therama.dev" target="_blank" class="text-blue-600 hover:underline">Apps</a></li>
            </ul>
          </div>
        </div>
        <button class="mt-6 w-full px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700" (click)="close.emit()">
          Close
        </button>
      </div>
    </div>
  `,
  styles: []
})
export class AboutMeModalComponent {
  @Output() close = new EventEmitter<void>();
}