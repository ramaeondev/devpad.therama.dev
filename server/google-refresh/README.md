Google Refresh Server

Purpose
- Minimal Express server to refresh Google OAuth access tokens using a stored refresh_token in Supabase.

How it works
1. The server reads a user's integration row from Supabase (provider `google_drive`).
2. It reads the `refresh_token` from that row and calls Google's token endpoint with `grant_type=refresh_token`.
3. On success it updates the Supabase `integrations` row with the new `access_token` and `expires_at` and returns the new token to the caller.

Required env vars
- SUPABASE_URL - e.g. https://xyz.supabase.co
- SUPABASE_SERVICE_ROLE_KEY - Supabase service_role key (keep secret)
- GOOGLE_CLIENT_ID - Google OAuth client id
- GOOGLE_CLIENT_SECRET - Google OAuth client secret
- PORT - optional (defaults to 3001)

Notes
- This server requires that you store `refresh_token` in the `integrations` row for the user. To get a refresh token you need to perform the OAuth Authorization Code flow with `access_type=offline` on the server side and save the returned `refresh_token` to Supabase.
- Keep the service role key and Google client secret secure. Run this server behind TLS and restrict access as needed.

Run locally

Install dependencies (Node 18+ recommended):

```bash
npm init -y
npm install express node-fetch
node server/google-refresh/index.js
```

Or use `nodemon` during development.

Example request

```bash
curl -X POST http://localhost:3001/api/google/refresh \
  -H "Content-Type: application/json" \
  -d '{"user_id":"<user-id>"}'
```

Start OAuth flow (browser redirect):

```bash
# open in browser, server will redirect to Google's consent screen
http://localhost:3001/api/google/auth?user_id=<user-id>
```

After user authorizes, Google will redirect to `GET /api/google/callback` on the server, which exchanges the code, stores `refresh_token` in Supabase, then redirects back to the frontend.

Smoke test

```bash
./server/google-refresh/check_endpoints.sh
```

Response
- On success: JSON with `access_token` and `expires_at` and `updated` (Supabase response).
- On failure: JSON with `error` field.
