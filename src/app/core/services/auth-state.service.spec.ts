import { TestBed } from '@angular/core/testing';
import { AuthStateService } from './auth-state.service';
import { SupabaseService } from './supabase.service';
import { EncryptionService } from './encryption.service';

function tick() {
  // Allow async background tasks triggered by setUser to complete
  return new Promise<void>((resolve) => setTimeout(resolve, 0));
}

describe('AuthStateService', () => {
  let service: AuthStateService;
  let mockSupabase: Partial<SupabaseService>;
  let mockEncryption: Partial<EncryptionService>;

  beforeEach(() => {
    mockSupabase = {
      getSession: jest.fn().mockResolvedValue({ session: null }),
    };

    mockEncryption = {
      setKeyFromDerivedMaterial: jest.fn().mockResolvedValue(undefined),
      clearKey: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        AuthStateService,
        { provide: SupabaseService, useValue: mockSupabase },
        { provide: EncryptionService, useValue: mockEncryption },
      ],
    });

    service = TestBed.inject(AuthStateService);
  });

  it('computed signals reflect user state', () => {
    expect(service.isAuthenticated()).toBe(false);
    expect(service.userEmail()).toBe('');
    expect(service.userId()).toBe('');

    service.setUser({ id: 'u1', email: 'me@example.com' } as any);

    expect(service.isAuthenticated()).toBe(true);
    expect(service.userEmail()).toBe('me@example.com');
    expect(service.userId()).toBe('u1');
  });

  it('autoLoadEncryptionKey handles missing session gracefully', async () => {
    // supabase.getSession returns { session: null } by default
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    service.setUser({ id: 'u2', email: 'x@y.z' } as any);
    await tick();

    expect(warnSpy).toHaveBeenCalledWith('No active session for encryption key derivation');
    expect(service.hasEncryptionKey()).toBe(false);

    warnSpy.mockRestore();
  });

  it('loads encryption key when session and edge function succeed', async () => {
    (mockSupabase!.getSession as jest.Mock).mockResolvedValue({ session: { access_token: 'tok' } });

    // stub global fetch
    const originalFetch = (global as any).fetch;
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ key: 'the-key', version: 'v1' }),
    } as any);
    (global as any).fetch = fetchMock;

    service.setUser({ id: 'u3', email: 'a@b.c' } as any);
    await tick();

    expect(mockEncryption!.setKeyFromDerivedMaterial).toHaveBeenCalledWith('the-key');
    expect(service.hasEncryptionKey()).toBe(true);

    // restore
    (global as any).fetch = originalFetch;
  });

  it('handles edge function failure gracefully', async () => {
    (mockSupabase!.getSession as jest.Mock).mockResolvedValue({
      session: { access_token: 'tok2' },
    });
    const originalFetch = (global as any).fetch;
    const fetchMock = jest.fn().mockResolvedValue({ ok: false, text: async () => 'bad' } as any);
    (global as any).fetch = fetchMock;
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    service.setUser({ id: 'u4', email: 'a@b.c' } as any);
    await tick();

    expect(errSpy).toHaveBeenCalled();
    expect(service.hasEncryptionKey()).toBe(false);

    // restore
    (global as any).fetch = originalFetch;
    errSpy.mockRestore();
  });

  it('clear() resets state and clears encryption', () => {
    service.setUser({ id: 'u5', email: 'hi@x.y' } as any);
    service.setLoading(true);
    expect(service.isAuthenticated()).toBe(true);
    expect(service.isLoading()).toBe(true);

    service.clear();

    expect(service.isAuthenticated()).toBe(false);
    expect(service.isLoading()).toBe(false);
    expect(mockEncryption!.clearKey).toHaveBeenCalled();
    expect(service.hasEncryptionKey()).toBe(false);
  });
});
