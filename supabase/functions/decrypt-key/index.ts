// Supabase Edge Function: decrypt-key
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createDecipheriv } from 'node:crypto';


const ENCRYPT_SECRET = Deno.env.get('ENCRYPT_SECRET');
if (!ENCRYPT_SECRET) {
  throw new Error('ENCRYPT_SECRET is not set in environment variables');
}
const IV_LENGTH = 16;

import { Buffer } from 'node:buffer';

function decryptSymmetricKey(encrypted: string, secret: string): string {
  const parts = encrypted.split(':');
  if (parts.length !== 2) {
    throw new Error(`Invalid encrypted format. Parts: ${parts.length}`);
  }
  const [ivBase64, encryptedKey] = parts;

  // Debug info will be caught by caller
  if (encryptedKey.length % 4 !== 0) {
    // This is a strong indicator of truncation
    throw new Error(`Invalid base64 length: ${encryptedKey.length}`);
  }

  const iv = Buffer.from(ivBase64, 'base64');
  const keyBytes = Buffer.from(secret, 'utf-8').slice(0, 32);
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
  } catch (e: any) {
    console.error('Decryption error:', e);

    // Create a simple hash of the secret for debugging (do not log the actual secret)
    let secretHash = 'undefined';
    if (ENCRYPT_SECRET) {
      let hash = 0;
      for (let i = 0; i < ENCRYPT_SECRET.length; i++) {
        const char = ENCRYPT_SECRET.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      secretHash = hash.toString();
    }

    return new Response(JSON.stringify({
      error: 'Decryption failed',
      details: e.message,
      stack: e.stack,
      debug: {
        secretLength: ENCRYPT_SECRET ? ENCRYPT_SECRET.length : 0,
        secretHash: secretHash,
        encryptedInputLength: encryptedKey ? encryptedKey.length : 0
      }
    }), { status: 400 });
  }
});
