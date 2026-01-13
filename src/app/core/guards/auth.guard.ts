import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';
import { AuthStateService } from '../services/auth-state.service';
import { FolderService } from '../../features/folders/services/folder.service';

export const authGuard: CanActivateFn = async (_route, state) => {
  const supabase = inject(SupabaseService);
  const authState = inject(AuthStateService);
  const folderService = inject(FolderService);
  const router = inject(Router);

  // E2E / test hook: allow tests to bypass auth guard by adding `?e2eForceAuth=1` to URL
  // and optionally setting window.__E2E_USER to a user object.
  try {
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    if (urlParams?.get('e2eForceAuth') === '1') {
      const e2eUser = (window as any).__E2E_USER || { id: 'u1', email: 'e2e@example.com' };
      authState.setUser(e2eUser as any);
      try {
        await folderService.initializeUserFolders(e2eUser.id);
      } catch (e) {
        // Ignore folder initialization errors for tests
      }
      return true;
    }
  } catch (e) {
    // ignore
  }

  const { session } = await supabase.getSession();

  if (session) {
    authState.setUser(session.user);

    // Initialize root folder for first-time users
    try {
      await folderService.initializeUserFolders(session.user.id);
    } catch (error) {
      console.error('Error initializing user folders:', error);
      // Continue even if folder initialization fails
    }

    return true;
  }

  router.navigate(['/auth/signin'], {
    queryParams: { returnUrl: state.url },
  });
  return false;
};
