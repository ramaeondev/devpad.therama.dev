import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { authGuard } from './auth.guard';
import { SupabaseService } from '../services/supabase.service';
import { AuthStateService } from '../services/auth-state.service';
import { FolderService } from '../../features/folders/services/folder.service';
import { runInInjectionContext } from '@angular/core';

describe('authGuard', () => {
  it('allows when session present and initializes folders', async () => {
    const supabase: any = { getSession: jest.fn().mockResolvedValue({ session: { user: { id: 'u1', email: 'u@e' } } }) };
    const authState: any = { setUser: jest.fn() };
    const folderService: any = { initializeUserFolders: jest.fn().mockResolvedValue(undefined) };
    const router: any = { navigate: jest.fn() };

    await TestBed.configureTestingModule({ providers: [
      { provide: SupabaseService, useValue: supabase },
      { provide: AuthStateService, useValue: authState },
      { provide: FolderService, useValue: folderService },
      { provide: Router, useValue: router },
    ] }).compileComponents();

    const res = await TestBed.runInInjectionContext(() => authGuard({} as any, { url: '/protected' } as any));
    expect(res).toBe(true);
    expect(authState.setUser).toHaveBeenCalledWith({ id: 'u1', email: 'u@e' });
    expect(folderService.initializeUserFolders).toHaveBeenCalledWith('u1');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('continues even if folder initialization fails', async () => {
    const supabase: any = { getSession: jest.fn().mockResolvedValue({ session: { user: { id: 'u2' } } }) };
    const authState: any = { setUser: jest.fn() };
    const folderService: any = { initializeUserFolders: jest.fn().mockRejectedValue(new Error('boom')) };
    const router: any = { navigate: jest.fn() };

    await TestBed.configureTestingModule({ providers: [
      { provide: SupabaseService, useValue: supabase },
      { provide: AuthStateService, useValue: authState },
      { provide: FolderService, useValue: folderService },
      { provide: Router, useValue: router },
    ] }).compileComponents();

    const res = await TestBed.runInInjectionContext(() => authGuard({} as any, { url: '/ok' } as any));
    expect(res).toBe(true);
    expect(authState.setUser).toHaveBeenCalled();
    expect(folderService.initializeUserFolders).toHaveBeenCalledWith('u2');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('redirects to signin when no session', async () => {
    const supabase: any = { getSession: jest.fn().mockResolvedValue({ session: null }) };
    const authState: any = { setUser: jest.fn() };
    const folderService: any = { initializeUserFolders: jest.fn() };
    const router: any = { navigate: jest.fn() };

    await TestBed.configureTestingModule({ providers: [
      { provide: SupabaseService, useValue: supabase },
      { provide: AuthStateService, useValue: authState },
      { provide: FolderService, useValue: folderService },
      { provide: Router, useValue: router },
    ] }).compileComponents();

    const res = await TestBed.runInInjectionContext(() => authGuard({} as any, { url: '/private' } as any));
    expect(res).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/auth/signin'], { queryParams: { returnUrl: '/private' } });
  });
});
