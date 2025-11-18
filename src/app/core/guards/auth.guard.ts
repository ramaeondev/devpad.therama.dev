import { inject, Injector } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';
import { AuthStateService } from '../services/auth-state.service';
import { FolderService } from '../../features/folders/services/folder.service';

export const authGuard: CanActivateFn = async (_route, state) => {
  const injector = inject(Injector);
  const authState = inject(AuthStateService);
  const router = inject(Router);

  // Lazily inject services to avoid circular dependencies with APP_INITIALIZER
  const supabase = injector.get(SupabaseService);
  const folderService = injector.get(FolderService);

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
