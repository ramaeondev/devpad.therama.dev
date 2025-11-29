import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Skip ALL Supabase requests - Supabase client handles its own auth
  const supabaseUrl = environment.supabase.url;

  if (req.url.includes(supabaseUrl) ||
    req.url.includes('.supabase.co')) {
    return next(req); // Let Supabase handle authentication
  }

  // For non-Supabase requests, you can add custom auth here if needed
  // For now, just pass through
  return next(req);
};