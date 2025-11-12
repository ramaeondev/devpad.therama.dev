import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';
import { AuthStateService } from '../services/auth-state.service';

export const authGuard: CanActivateFn = async (route, state) => {
  const supabase = inject(SupabaseService);
  const authState = inject(AuthStateService);
  const router = inject(Router);

  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    authState.setUser(session.user);
    return true;
  }

  router.navigate(['/auth/signin'], { 
    queryParams: { returnUrl: state.url } 
  });
  return false;
};
