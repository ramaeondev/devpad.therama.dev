// Supabase Edge Function: decrypt-key
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createDecipheriv } from 'node:crypto';


const ENCRYPT_SECRET = Deno.env.get('ENCRYPT_SECRET');
if (!ENCRYPT_SECRET) {
  throw new Error('ENCRYPT_SECRET is not set in environment variables');
}
const IV_LENGTH = 16;

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function decryptSymmetricKey(encrypted: string, secret: string): string {
  const [ivBase64, encryptedKey] = encrypted.split(':');
  const iv = base64ToUint8Array(ivBase64);
  const keyBytes = new TextEncoder().encode(secret).slice(0, 32);
  const decipher = createDecipheriv('aes-256-cbc', keyBytes, iv);
  let decrypted = decipher.update(encryptedKey, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

serve(async (req) => {
  const { encryptedKey } = await req.json();
  if (!encryptedKey) {
    return new Response(JSON.stringify({ error: 'Missing encryptedKey' }), { status: 400 });
  }
  try {
    const key = decryptSymmetricKey(encryptedKey, ENCRYPT_SECRET);
    return new Response(JSON.stringify({ key }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Decryption failed' }), { status: 400 });
  }
});
