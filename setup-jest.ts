import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';
import 'zone.js/testing';

// Initialize Angular testing environment for Zone.js-based tests
setupZoneTestEnv();

// Basic global mocks for browser APIs used by components
Object.defineProperty(window, 'CSS', { value: null });

window.matchMedia =
  window.matchMedia ||
  function () {
    return {
      matches: false,
      addListener: () => {},
      removeListener: () => {},
    };
  };

// Minimal jasmine.clock() shim to support legacy tests that use jasmine.clock().
// Maps to simple Date mocking and no-op install/uninstall so tests can run under Jest.
declare const global: any;

let __realDate: typeof Date | undefined;

global.jasmine = global.jasmine || {};

global.jasmine.clock =
  global.jasmine.clock ||
  function () {
    return {
      install() {
        // no-op; Angular's fakeAsync + tick will control timers
      },
      uninstall() {
        if (__realDate) {
          (global as any).Date = __realDate;
          __realDate = undefined;
        }
      },
      mockDate(d: Date) {
        __realDate = (global as any).Date;
        (global as any).Date = class extends Date {
          constructor(...args: any[]) {
            if (args.length === 0) {
              // when called without args, return mocked date
              return new __realDate(d);
            }
            // @ts-ignore
            return new __realDate(...args);
          }
        } as any;
      },
    };
  };

// Avoid constructing real Supabase clients during tests by mocking the module
// This prevents console warnings and unintended side effects in unit tests
jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      signOut: async () => ({ error: null }),
    },
    from: (table: string) => ({
      select: jest.fn().mockResolvedValue({ data: [], error: null }),
      insert: jest.fn().mockResolvedValue({ data: [], error: null }),
      update: jest.fn().mockResolvedValue({ data: [], error: null }),
      delete: jest.fn().mockResolvedValue({ data: [], error: null }),
    }),
    storage: () => ({ from: () => ({ get: jest.fn().mockResolvedValue({ data: null }) }) }),
  }),
}));

// Polyfill blob URL helpers used by image-cropper and other libs
global.URL.createObjectURL = global.URL.createObjectURL || jest.fn(() => 'blob:mock');
global.URL.revokeObjectURL = global.URL.revokeObjectURL || jest.fn();

// Mock ESM-only dependency 'marked' which causes parser issues in Jest
jest.mock('marked', () => ({
  marked: jest.fn(() => '<p></p>'),
}));
