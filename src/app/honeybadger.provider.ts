import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import Honeybadger from '@honeybadger-io/js';
import { environment } from '../environments/environment';

export function provideHoneybadger(): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: 'HONEYBADGER_INIT',
      useFactory: () => {
        Honeybadger.configure({
          apiKey: environment.HONEYBADGER_API_KEY,
          environment: environment.production ? 'production' : 'development',
        });
        return true;
      },
    },
  ]);
}
