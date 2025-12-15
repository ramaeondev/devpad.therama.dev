#!/usr/bin/env node

const crypto = require('crypto');
const readline = require('readline');

function base64urlEncode(data) {
    return Buffer.from(data)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

function generateJWT(secret, role, expYears = 10) {
    // Header
    const header = {
        alg: 'HS256',
        typ: 'JWT'
    };

    // Payload with exp field (Unix timestamp)
    const expTimestamp = Math.floor(Date.now() / 1000) + (expYears * 365 * 24 * 60 * 60);
    const payload = {
        role: role,
        iss: 'supabase',
        exp: expTimestamp
    };

    // Encode header and payload
    const headerEncoded = base64urlEncode(JSON.stringify(header));
    const payloadEncoded = base64urlEncode(JSON.stringify(payload));

    // Create signature
    const message = `${headerEncoded}.${payloadEncoded}`;
    const signature = crypto
        .createHmac('sha256', secret)
        .update(message)
        .digest();
    const signatureEncoded = base64urlEncode(signature);

    // Combine all parts
    return `${message}.${signatureEncoded}`;
}

// Main script
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('='.repeat(60));
console.log('Supabase JWT Token Generator');
console.log('='.repeat(60));

rl.question('\nEnter your JWT_SECRET from .env file: ', (jwtSecret) => {
    jwtSecret = jwtSecret.trim();

    if (!jwtSecret) {
        console.log('Error: JWT_SECRET cannot be empty!');
        rl.close();
        process.exit(1);
    }

    console.log('\nGenerating tokens with 10-year expiration...\n');

    const anonKey = generateJWT(jwtSecret, 'anon');
    const serviceRoleKey = generateJWT(jwtSecret, 'service_role');

    console.log('='.repeat(60));
    console.log('Generated JWT Tokens:');
    console.log('='.repeat(60));
    console.log(`\nANON_KEY=${anonKey}`);
    console.log(`\nSERVICE_ROLE_KEY=${serviceRoleKey}`);
    console.log('\n' + '='.repeat(60));
    console.log('Instructions:');
    console.log('='.repeat(60));
    console.log('1. Copy the tokens above');
    console.log('2. Edit your .env file:');
    console.log('   nano /srv/supabase/supabase/docker/.env');
    console.log('3. Replace ANON_KEY and SERVICE_ROLE_KEY with the new values');
    console.log('4. Restart Supabase:');
    console.log('   cd /srv/supabase/supabase/docker');
    console.log('   docker-compose restart');
    console.log('='.repeat(60));

    rl.close();
});