// Supabase Edge Function: encrypt-key
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createCipheriv, randomBytes } from 'node:crypto';

const ENCRYPT_SECRET = Deno.env.get('ENCRYPT_SECRET');
if (!ENCRYPT_SECRET) {
  throw new Error('ENCRYPT_SECRET is not set in environment variables');
}
const IV_LENGTH = 16;

function base64FromUint8Array(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function encryptSymmetricKey(key: string, secret: string): string {
  const iv = randomBytes(IV_LENGTH);
  const keyBytes = new TextEncoder().encode(secret).slice(0, 32);
  const cipher = createCipheriv('aes-256-cbc', keyBytes, iv);
  let encrypted = cipher.update(key, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return `${base64FromUint8Array(iv)}:${encrypted}`;
}

serve(async (req) => {
  const { key } = await req.json();
  if (!key) {
    return new Response(JSON.stringify({ error: 'Missing key' }), { status: 400 });
  }
  const encryptedKey = encryptSymmetricKey(key, ENCRYPT_SECRET);
  return new Response(JSON.stringify({ encryptedKey }), { status: 200 });
});
