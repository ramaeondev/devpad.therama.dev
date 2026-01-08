import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Derives a user-specific encryption key using:
 * - User email (unique per user)
 * - Master secret from Supabase secrets (server-side only)
 *
 * Returns base64-encoded key material for client-side AES-GCM encryption
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify authentication using JWT directly
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Extract JWT token
    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      throw new Error('Invalid authorization header');
    }

    // Initialize Supabase client with service role to verify token
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Verify the JWT token and get user
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser(token);

    if (authError || !user?.email) {
      console.error('Auth error:', authError);
      throw new Error('Unauthorized');
    }

    // Get master secret from environment
    const masterSecret = Deno.env.get('ENCRYPTION_MASTER_SECRET');
    if (!masterSecret) {
      throw new Error('Master secret not configured');
    }

    // Derive user-specific key using PBKDF2
    // Input: user email + master secret
    // Output: 256-bit key for AES-GCM
    const encoder = new TextEncoder();
    const keyMaterial = encoder.encode(user.email + masterSecret);

    // Import key material
    const importedKey = await crypto.subtle.importKey(
      'raw',
      keyMaterial,
      { name: 'PBKDF2' },
      false,
      ['deriveBits'],
    );

    // Derive 256-bit key
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: encoder.encode('devpad-v1-salt'), // Static salt, uniqueness comes from email
        iterations: 100000,
        hash: 'SHA-256',
      },
      importedKey,
      256, // 256 bits for AES-256
    );

    // Convert to base64 for transmission
    const derivedArray = new Uint8Array(derivedBits);
    const base64Key = btoa(String.fromCharCode(...derivedArray));

    return new Response(
      JSON.stringify({
        key: base64Key,
        version: 'v1',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('Error deriving encryption key:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});
