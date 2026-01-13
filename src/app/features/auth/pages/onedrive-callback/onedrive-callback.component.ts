import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-onedrive-callback',
  standalone: true,
  template: `
    <div class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <div
          class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"
        ></div>
        <p class="text-gray-600 dark:text-gray-400">Connecting to OneDrive...</p>
      </div>
    </div>
  `,
})
export class OneDriveCallbackComponent implements OnInit {
  ngOnInit() {
    // Extract access token and expiration from URL fragment
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const expiresIn = params.get('expires_in');
    const error = params.get('error');

    // Send message to opener window
    if (window.opener) {
      window.opener.postMessage(
        {
          accessToken,
          expiresIn: expiresIn ? parseInt(expiresIn, 10) : undefined,
          error,
        },
        window.location.origin,
      );
      window.close();
    }
  }
}
