import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    production: process.env.PRODUCTION === 'true',
    supabase: {
      url: process.env.SUPABASE_URL,
      anonKey: process.env.SUPABASE_ANON_KEY,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
    },
    microsoft: {
      clientId: process.env.MICROSOFT_CLIENT_ID,
      redirectUri: process.env.MICROSOFT_REDIRECT_URI,
    },
    apiUrl: process.env.API_URL,
    appVersion: process.env.APP_VERSION,
  });
}
