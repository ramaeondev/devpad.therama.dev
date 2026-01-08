import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-logout',
  standalone: true,
  template: `
    <div class="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div class="text-center">
        <div
          class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"
        ></div>
        <p class="text-gray-600 dark:text-gray-400">Signing out...</p>
      </div>
    </div>
  `,
})
export class LogoutComponent implements OnInit {
  ngOnInit() {
    // Azure AD front-channel logout endpoint
    // This is called by Microsoft to clear the session
    // We don't need to do anything specific here - just acknowledge the request

    // Notify parent window if opened in iframe
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'logout-acknowledged' }, window.location.origin);
    }

    // If directly accessed, redirect to home
    if (window.parent === window) {
      setTimeout(() => {
        window.location.href = '/';
      }, 500);
    }
  }
}
