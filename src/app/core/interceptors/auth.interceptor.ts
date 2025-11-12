import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { SupabaseService } from '../services/supabase.service';

export const authInterceptor: HttpInterceptorFn = async (req, next) => {
  const supabase = inject(SupabaseService);
  
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session?.access_token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${session.access_token}`
      }
    });
  }
  
  return next(req);
};
