import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';

export interface AppConfig {
  production: boolean;
  supabase: {
    url: string;
    anonKey: string;
  };
  google: {
    clientId: string;
  };
  microsoft: {
    clientId: string;
    redirectUri: string;
  };
  apiUrl: string;
  appVersion: string;
}

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  private http = inject(HttpClient);
  config = signal<AppConfig | null>(null);

  async loadConfig(): Promise<void> {
    try {
      const config = await lastValueFrom(this.http.get<AppConfig>('/api/config'));
      this.config.set(config as AppConfig);
    } catch (error) {
      console.error('Failed to load configuration', error);
    }
  }
}
