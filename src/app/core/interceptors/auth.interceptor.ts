import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Skip ALL Supabase requests - Supabase client handles its own auth
  const supabaseUrl = environment.supabase.url;

  // Derive host from configured supabase URL; avoid relying on hardcoded
  // '.supabase.co' domain so that self-hosted or other domains are supported.
  let supabaseHost: string | undefined;
  try {
    supabaseHost = new URL(supabaseUrl).host;
  } catch (e) {
    supabaseHost = supabaseUrl;
  }

  try {
    const reqHost = new URL(req.url).host;
    if (reqHost === supabaseHost || req.url.includes(supabaseUrl)) {
      return next(req); // Let Supabase handle authentication
    }
  } catch (e) {
    // When req.url is a relative URL, fallback to substring check
    if (req.url.includes(supabaseUrl)) {
      return next(req);
    }
  }

  // For non-Supabase requests, you can add custom auth here if needed
  // For now, just pass through
  return next(req);
};
