#!/usr/bin/env node
/*
 Simple token refresh server
 - Expects env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, PORT
 - POST /api/google/refresh { user_id }
 - Looks up integrations row for provider=google_drive and given user_id, reads refresh_token
 - Calls Google's token endpoint to refresh access token, updates Supabase, and returns new access_token and expires_at
*/

import express from 'express';
import fetch from 'node-fetch';

const app = express();
app.use(express.json());

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const SERVER_BASE_URL = process.env.SERVER_BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
const FRONTEND_REDIRECT = process.env.FRONTEND_REDIRECT || 'http://localhost:4200';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.error('Missing required env vars. See README.');
  process.exit(1);
}

app.post('/api/google/refresh', async (req, res) => {
  try {
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ error: 'user_id required' });

    // Get integration row
    const qUrl = `${SUPABASE_URL}/rest/v1/integrations?user_id=eq.${encodeURIComponent(user_id)}&provider=eq.google_drive&select=*`;
    const getResp = await fetch(qUrl, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });

    if (!getResp.ok) {
      const body = await getResp.text();
      console.error('Failed to fetch integration:', getResp.status, body);
      return res.status(500).json({ error: 'Failed to fetch integration' });
    }

    const rows = await getResp.json();
    const integration = Array.isArray(rows) ? rows[0] : rows;

    if (!integration || !integration.refresh_token) {
      return res.status(400).json({ error: 'No refresh_token available for user' });
    }

    const refreshToken = integration.refresh_token;

    // Exchange refresh token for new access token
    const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!tokenResp.ok) {
      const text = await tokenResp.text();
      console.error('Refresh token exchange failed:', tokenResp.status, text);
      return res.status(500).json({ error: 'Failed to refresh token' });
    }

    const tokenData = await tokenResp.json();
    const newAccessToken = tokenData.access_token;
    const expiresIn = tokenData.expires_in || 3600;
    const expiresAt = Date.now() + expiresIn * 1000;

    // Update Supabase integration row
    const patchUrl = `${SUPABASE_URL}/rest/v1/integrations?user_id=eq.${encodeURIComponent(user_id)}&provider=eq.google_drive`;
    const patchResp = await fetch(patchUrl, {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({ access_token: newAccessToken, expires_at: expiresAt, updated_at: new Date().toISOString() }),
    });

    if (!patchResp.ok) {
      const body = await patchResp.text();
      console.error('Failed to update integration:', patchResp.status, body);
      return res.status(500).json({ error: 'Failed to update integration' });
    }

    const updated = await patchResp.json();

    // Return new token info
    return res.json({ access_token: newAccessToken, expires_at: expiresAt, updated: updated });
  } catch (err) {
    console.error('Unexpected error in refresh endpoint:', err);
    return res.status(500).json({ error: 'unexpected_error' });
  }
});

// Start OAuth on server side: redirect user to Google's consent screen to obtain a refresh token
app.get('/api/google/auth', (req, res) => {
  const { user_id } = req.query;
  if (!user_id) return res.status(400).send('user_id required');

  const redirectUri = `${SERVER_BASE_URL}/api/google/callback`;
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.email',
    access_type: 'offline',
    prompt: 'consent',
    state: String(user_id),
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  return res.redirect(authUrl);
});

// OAuth callback: exchange code for tokens and store refresh_token + access_token in Supabase
app.get('/api/google/callback', async (req, res) => {
  try {
    const { code, state } = req.query; // state contains user_id
    const userId = String(state || '');
    if (!code || !userId) return res.status(400).send('Missing code or state');

    const redirectUri = `${SERVER_BASE_URL}/api/google/callback`;

    const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(code),
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResp.ok) {
      const txt = await tokenResp.text();
      console.error('Code exchange failed:', tokenResp.status, txt);
      return res.status(500).send('Token exchange failed');
    }

    const tokenData = await tokenResp.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token; // may be undefined if not granted
    const expiresIn = tokenData.expires_in || 3600;
    const expiresAt = Date.now() + expiresIn * 1000;

    // Optionally fetch user info to get email
    let email = null;
    try {
      const ui = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', { headers: { Authorization: `Bearer ${accessToken}` } });
      if (ui.ok) {
        const ud = await ui.json();
        email = ud.email;
      }
    } catch (e) {
      // ignore
    }

    // Upsert integration row with refresh_token (if provided) and access_token
    const patchUrl = `${SUPABASE_URL}/rest/v1/integrations?user_id=eq.${encodeURIComponent(userId)}&provider=eq.google_drive`;
    const body = {
      access_token: accessToken,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    };
    if (refreshToken) body.refresh_token = refreshToken;
    if (email) body.email = email;

    const patchResp = await fetch(patchUrl, {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(body),
    });

    if (!patchResp.ok) {
      const text = await patchResp.text();
      console.error('Failed to update integration during callback:', patchResp.status, text);
      return res.status(500).send('Failed to save tokens');
    }

    // Redirect back to frontend with success
    const redirect = `${FRONTEND_REDIRECT}/?google_connect=success`;
    return res.redirect(redirect);
  } catch (err) {
    console.error('Error in callback:', err);
    return res.status(500).send('internal_error');
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Google refresh server listening on ${PORT}`));
