import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://devpad.therama.dev',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: corsHeaders
    });
  }
  const { user_id } = await req.json();
  // Get env vars
  const client_id = Deno.env.get('GOOGLE_CLIENT_ID');
  const client_secret = Deno.env.get('GOOGLE_CLIENT_SECRET');
  if (!client_id || !client_secret) {
    return new Response('Missing Google OAuth env vars', {
      status: 500,
      headers: corsHeaders
    });
  }
  // Fetch refresh_token from Supabase
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !supabaseKey) {
    return new Response('Missing Supabase env vars', {
      status: 500,
      headers: corsHeaders
    });
  }
  const integrationResp = await fetch(`${supabaseUrl}/rest/v1/integrations?user_id=eq.${user_id}&provider=eq.google_drive&select=refresh_token`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });
  const integrationData = await integrationResp.json();
  const refresh_token = integrationData[0]?.refresh_token;
  if (!refresh_token) {
    return new Response('No refresh token found', {
      status: 400,
      headers: corsHeaders
    });
  }
  // Exchange refresh_token for new access_token
  const params = new URLSearchParams({
    client_id,
    client_secret,
    refresh_token,
    grant_type: 'refresh_token'
  });
  const tokenResp = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });
  if (!tokenResp.ok) {
    const error = await tokenResp.text();
    return new Response(error, {
      status: 400,
      headers: corsHeaders
    });
  }
  const tokenData = await tokenResp.json();
  // Optionally, update the new access_token in Supabase
  const expiresAt = Date.now() + (tokenData.expires_in || 3600) * 1000;
  await fetch(`${supabaseUrl}/rest/v1/integrations?user_id=eq.${user_id}&provider=eq.google_drive`, {
    method: 'PATCH',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      access_token: tokenData.access_token,
      expires_at: expiresAt,
      updated_at: new Date().toISOString()
    })
  });
  return new Response(JSON.stringify({
    access_token: tokenData.access_token,
    expires_at: expiresAt
  }), {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
});
