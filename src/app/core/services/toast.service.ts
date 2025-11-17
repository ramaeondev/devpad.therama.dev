import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private toasts = signal<Toast[]>([]);

  toastList = this.toasts.asReadonly();

  show(type: Toast['type'], message: string, duration: number = 3000) {
    const id = Math.random().toString(36).substring(7);
    const toast: Toast = { id, type, message, duration };

    this.toasts.update((toasts) => [...toasts, toast]);

    if (duration > 0) {
      setTimeout(() => {
        this.remove(id);
      }, duration);
    }
  }

  success(message: string, duration?: number) {
    this.show('success', message, duration);
  }

  error(message: string, duration?: number) {
    this.show('error', message, duration);
  }

  info(message: string, duration?: number) {
    this.show('info', message, duration);
  }

  warning(message: string, duration?: number) {
    this.show('warning', message, duration);
  }

  remove(id: string) {
    this.toasts.update((toasts) => toasts.filter((t) => t.id !== id));
  }
}
