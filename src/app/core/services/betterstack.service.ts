import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { lastValueFrom } from 'rxjs';

export type LogLevel = 'debug' | 'info' | 'warning' | 'error';

@Injectable({
  providedIn: 'root',
})
export class BetterstackService {
  private readonly forwardUrl = environment.BETTERSTACK_LOGS_INGEST_URL || '';
  private readonly clientForwardUrl = environment.BETTERSTACK_CLIENT_FORWARD_URL || environment.BETTERSTACK_CLIENT_LOGS_FORWARD_URL || '';
  private readonly serviceName = environment.BETTERSTACK_SERVICE_NAME || 'devpad';

  constructor(private readonly http: HttpClient) {}

  async sendLog(level: LogLevel, message: string, meta: Record<string, any> = {}) {
    const payload = {
      service: this.serviceName,
      level,
      message,
      meta,
      timestamp: new Date().toISOString(),
    };

    // Prefer using a client-side forwarder (Supabase function) to avoid exposing ingestion key
    if (this.clientForwardUrl) {
      try {
        await lastValueFrom(this.http.post(this.clientForwardUrl, payload));
      } catch (err) {
        // don't throw in production flow — best-effort
        console.warn('Betterstack: failed to forward log to clientForwardUrl', err);
      }
    }

    // If a direct ingest URL has been provided (not recommended from browser), try that
    if (this.forwardUrl) {
      try {
        await lastValueFrom(this.http.post(this.forwardUrl, payload));
      } catch (err) {
        console.warn('Betterstack: failed to send directly to ingest URL', err);
      }
    }

    // no-op; nothing configured
    
  }

  notifyError(error: unknown, context: Record<string, any> = {}) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? (error.stack || undefined) : undefined;
    return this.sendLog('error', message, { stack, ...context });
  }
}
