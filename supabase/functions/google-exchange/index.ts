import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://devpad.therama.dev',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
    });
  }
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: corsHeaders,
    });
  }
  const { code, user_id } = await req.json();
  // These should be set in your Supabase project environment variables
  const client_id = Deno.env.get('GOOGLE_CLIENT_ID');
  const client_secret = Deno.env.get('GOOGLE_CLIENT_SECRET');
  const redirect_uri = Deno.env.get('GOOGLE_REDIRECT_URI'); // Must match your OAuth config
  if (!client_id || !client_secret || !redirect_uri) {
    return new Response('Missing Google OAuth env vars', {
      status: 500,
    });
  }
  // Exchange code for tokens
  const params = new URLSearchParams({
    code,
    client_id,
    client_secret,
    redirect_uri,
    grant_type: 'authorization_code',
  });
  const tokenResp = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  if (!tokenResp.ok) {
    const error = await tokenResp.text();
    return new Response(error, {
      status: 400,
    });
  }
  const tokenData = await tokenResp.json();
  // Get user email
  const userInfoResp = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
    },
  });
  const userInfo = await userInfoResp.json();
  // Return tokens and email to frontend
  return new Response(
    JSON.stringify({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in,
      email: userInfo.email,
      user_id,
    }),
    {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    },
  );
});
