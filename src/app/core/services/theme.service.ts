import { Injectable, signal, effect, inject, Injector } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthStateService } from './auth-state.service';

/**
 * Theme modes supported by the app.
 * - 'light' : force light theme
 * - 'dark'  : force dark theme
 * - 'auto'  : choose light/dark based on user's local time (day/night)
 * - 'system': follow OS/browser prefers-color-scheme
 */
export type Theme = 'light' | 'dark' | 'auto' | 'system';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private currentTheme = signal<Theme>('system');
  theme = this.currentTheme.asReadonly();
  private auth = inject(AuthStateService);
  private injector = inject(Injector);
  private supabase: SupabaseService | null = null;

  constructor() {
    // Apply theme changes whenever currentTheme changes
    effect(() => {
      this.applyTheme(this.currentTheme());
    });

    // If a user logs in and no explicit local preference exists, default to
    // 'auto' and persist that preference to the user's metadata so subsequent
    // logins keep the same behavior.
    effect(() => {
      try {
        const saved = localStorage.getItem('theme');
        const user = this.auth.user();
        if (!saved && user) {
          // If user metadata already has a theme preference, honor it.
          const metaTheme = (user as any)?.user_metadata?.theme as Theme | undefined;
          if (metaTheme) {
            this.setTheme(metaTheme);
          } else {
            // First-time login: choose 'auto' as the stored preference and
            // apply it (auto chooses dark/light based on local time).
            this.setTheme('auto');
          }
        }
      } catch (err) {
        // Ignore errors during this best-effort initialization
      }
    });
  }

  initializeTheme() {
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    if (savedTheme) {
      this.currentTheme.set(savedTheme);
    } else {
      // No saved preference; let the effects above set a default when a user
      // is available, or fall back to system when unauthenticated.
      this.currentTheme.set('system');
    }
  }

  setTheme(theme: Theme) {
    this.currentTheme.set(theme);
    try {
      localStorage.setItem('theme', theme);
    } catch (err) {
      // ignore storage errors
    }
    // Persist theme preference to Supabase user metadata when available
    try {
      const userId = this.auth.userId();
      if (userId) {
        if (!this.supabase) {
          this.supabase = this.injector.get(SupabaseService);
        }
        // Update user's metadata with theme preference. Best-effort only.
        this.supabase.auth.updateUser({ data: { theme } }).catch((err) => {
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

  /**
   * Decide whether the given theme should result in a dark UI.
   */
  private applyTheme(theme: Theme) {
    const prefersDark =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isNightTime = () => {
      try {
        const h = new Date().getHours();
        // Consider night between 19:00 - 06:00 local time
        return h >= 19 || h < 6;
      } catch {
        return false;
      }
    };

    const isDark =
      theme === 'dark' ||
      (theme === 'system' && prefersDark) ||
      (theme === 'auto' && isNightTime());

    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
}
