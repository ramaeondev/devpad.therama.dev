import { ErrorHandler, Injectable } from '@angular/core';
import Honeybadger from '@honeybadger-io/js';

@Injectable()
export class HoneybadgerErrorHandler implements ErrorHandler {
  handleError(error: unknown): void {
    Honeybadger.notify(error instanceof Error ? error : new Error(String(error)));
    console.error(error);
  }
}
