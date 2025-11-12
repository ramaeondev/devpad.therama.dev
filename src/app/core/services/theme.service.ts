import { Injectable, signal, effect } from '@angular/core';

export type Theme = 'light' | 'dark' | 'system';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private currentTheme = signal<Theme>('system');
  theme = this.currentTheme.asReadonly();

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
