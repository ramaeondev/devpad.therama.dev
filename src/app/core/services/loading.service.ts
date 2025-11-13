import { Injectable, computed, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private activeRequests = signal(0);

  readonly isLoading = computed(() => this.activeRequests() > 0);

  start() {
    this.activeRequests.update(v => v + 1);
  }

  stop() {
    this.activeRequests.update(v => Math.max(0, v - 1));
  }

  // Utility wrapper for promises
  async withLoading<T>(promiseFactory: () => Promise<T>): Promise<T> {
    this.start();
    try {
      return await promiseFactory();
    } finally {
      this.stop();
    }
  }
}
