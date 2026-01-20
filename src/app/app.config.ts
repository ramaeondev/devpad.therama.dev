import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
  ErrorHandler,
} from '@angular/core';
import { provideRouter, withComponentInputBinding, withViewTransitions } from '@angular/router';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { loadingInterceptor } from './core/interceptors/loading.interceptor';
import { HoneybadgerErrorHandler } from './honeybadger-error.handler';
import { provideHoneybadger } from './honeybadger.provider';
import { provideBetterstack } from './betterstack.provider';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding(), withViewTransitions()),
    provideHttpClient(withInterceptors([loadingInterceptor, authInterceptor]), withFetch()),
    provideAnimations(),
    provideHoneybadger(),
    provideBetterstack(),
    { provide: ErrorHandler, useClass: HoneybadgerErrorHandler },
  ],
};
