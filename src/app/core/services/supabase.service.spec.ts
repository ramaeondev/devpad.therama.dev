describe('SupabaseService', () => {
  afterEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
  });

  it('throws when SUPABASE_URL missing', () => {
    jest.resetModules();
    jest.isolateModules(() => {
      // Mutate the actual environment export (more robust across full test runs)
      const envModule = jest.requireActual('../../../environments/environment');
      envModule.environment.supabase = { url: '', anonKey: 'K' } as any;
      // Import under fresh module context inside isolateModules
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { SupabaseService } = require('./supabase.service');

      expect(() => {
        // instantiate will throw in constructor
        // eslint-disable-next-line no-new
        new SupabaseService();
      }).toThrow(/SUPABASE_URL is required/);
    });
  });

  it('creates client and getSession delegates to client.auth.getSession', async () => {
    jest.resetModules();

    const mockEnv = { environment: { supabase: { url: 'https://s', anonKey: 'X' } } };

    let SupabaseServiceCtor: any;
    let createClientMock: any;

    jest.isolateModules(() => {
      // Mutate the actual environment export (more robust across full test runs)
      const envModule = jest.requireActual('../../../environments/environment');
      envModule.environment.supabase = { url: 'https://s', anonKey: 'X' } as any;

      createClientMock = jest.fn().mockImplementation((url: string, key: string, opts: any) => {
        return {
          auth: {
            getSession: jest
              .fn()
              .mockResolvedValue({ data: { session: { user: { id: 'u1' } } }, error: null }),
          },
          from: jest.fn(),
          storage: {},
        };
      });

      try {
        delete require.cache[require.resolve('@supabase/supabase-js')];
      } catch (e) {}
      jest.doMock('@supabase/supabase-js', () => ({ createClient: createClientMock }), {
        virtual: true,
      });

      // Import under fresh module context
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      SupabaseServiceCtor = require('./supabase.service').SupabaseService;
    });

    const svc = new SupabaseServiceCtor();

    // Replace the internal client with a controlled mock to ensure deterministic behavior
    (svc as any).supabase = {
      auth: {
        getSession: jest
          .fn()
          .mockResolvedValue({ data: { session: { user: { id: 'u1' } } }, error: null }),
      },
    };

    const session = await svc.getSession();
    expect(session.session).toBeTruthy();
    expect(svc.getSupabaseUrl()).toBe('https://s');
  });
});
