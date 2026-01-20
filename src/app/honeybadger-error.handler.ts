import { ErrorHandler, Injectable } from '@angular/core';
import Honeybadger from '@honeybadger-io/js';
import { BetterstackService } from './core/services/betterstack.service';

@Injectable()
export class HoneybadgerErrorHandler implements ErrorHandler {
  constructor(private readonly betterstack: BetterstackService) {}

  handleError(error: unknown): void {
    Honeybadger.notify(error instanceof Error ? error : new Error(String(error)));
    // Forward to BetterStack (best-effort)
    // best-effort notify; do not block error handling
    this.betterstack.notifyError(error as Error, { source: 'global-error-handler' }).catch((err) => {
      console.warn('Betterstack notify failed', err);
    });

    console.error(error);
  }
}
