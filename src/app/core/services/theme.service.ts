import { Injectable, signal, effect, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthStateService } from './auth-state.service';

export type Theme = 'light' | 'dark' | 'system';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private currentTheme = signal<Theme>('system');
  theme = this.currentTheme.asReadonly();
  private supabase = inject(SupabaseService);
  private auth = inject(AuthStateService);

  constructor() {
    // Apply theme changes
    effect(() => {
      this.applyTheme(this.currentTheme());
    });
  }

  initializeTheme() {
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme) {
      this.currentTheme.set(savedTheme);
    } else {
      this.currentTheme.set('system');
    }
  }

  setTheme(theme: Theme) {
    this.currentTheme.set(theme);
    localStorage.setItem('theme', theme);
    // Persist theme preference to Supabase user metadata when available
    try {
      const userId = this.auth.userId();
      if (userId) {
        // Update user's metadata with theme preference. This uses the client-side
        // auth.updateUser to set user_metadata.theme. It's best-effort; failures
        // are logged but do not block the UI.
        this.supabase.auth.updateUser({ data: { theme } }).catch(err => {
          console.warn('Failed to persist theme preference to Supabase:', err);
        });
      }
    } catch (err) {
      // Ignore persistence errors
    }
  }

  toggleTheme() {
    const current = this.currentTheme();
    const next = current === 'light' ? 'dark' : 'light';
    this.setTheme(next);
  }

  private applyTheme(theme: Theme) {
    const isDark = theme === 'dark' || 
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
}
