// Supabase Edge Function: encrypt-key
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createCipheriv, randomBytes } from 'node:crypto';
const ENCRYPT_SECRET = Deno.env.get('ENCRYPT_SECRET');
if (!ENCRYPT_SECRET) {
  throw new Error('ENCRYPT_SECRET is not set in environment variables');
}
const IV_LENGTH = 16;
import { Buffer } from 'node:buffer';
function encryptSymmetricKey(key, secret) {
  const iv = randomBytes(IV_LENGTH);
  const keyBytes = Buffer.from(secret, 'utf-8').slice(0, 32);
  const cipher = createCipheriv('aes-256-cbc', keyBytes, iv);
  let encrypted = cipher.update(key, 'utf8', 'base64');
  const finalPart = cipher.final('base64');
  encrypted += finalPart;
  const ivBase64 = Buffer.from(iv).toString('base64');
  const result = `${ivBase64}:${encrypted}`;
  console.log('Encryption Debug:');
  console.log('  Input key length:', key.length);
  console.log('  IV length (bytes):', iv.length);
  console.log('  IV base64 length:', ivBase64.length);
  console.log('  Cipher update output length:', encrypted.length - finalPart.length);
  console.log('  Cipher final output length:', finalPart.length);
  console.log('  Total encrypted length:', encrypted.length);
  console.log('  Result length:', result.length);
  return result;
}
serve(async (req)=>{
  const { key } = await req.json();
  if (!key) {
    return new Response(JSON.stringify({
      error: 'Missing key'
    }), {
      status: 400
    });
  }
  const encryptedKey = encryptSymmetricKey(key, ENCRYPT_SECRET);
  // Create a simple hash of the secret for debugging
  let secretHash = 'undefined';
  if (ENCRYPT_SECRET) {
    let hash = 0;
    for(let i = 0; i < ENCRYPT_SECRET.length; i++){
      const char = ENCRYPT_SECRET.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    secretHash = hash.toString();
  }
  return new Response(JSON.stringify({
    encryptedKey,
    debug: {
      secretLength: ENCRYPT_SECRET.length,
      secretHash: secretHash,
      inputKeyLength: key.length,
      inputKeyStart: key.substring(0, 5)
    }
  }), {
    status: 200
  });
});
