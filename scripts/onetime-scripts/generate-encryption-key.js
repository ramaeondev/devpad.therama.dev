#!/usr/bin/env node
const crypto = require('crypto');

function printUsage() {
  console.log('Usage: node scripts/generate-encryption-key.js [--bytes N] [--format base64url|base64|hex] [--name ENV_VAR_NAME] [--export]');
  console.log('Example: node scripts/generate-encryption-key.js --bytes 32 --format base64url --name ENCRYPTION_MASTER_SECRET --export');
}

const args = process.argv.slice(2);
let bytes = 32;
let format = 'base64url';
let envName = 'ENCRYPTION_MASTER_SECRET';
let doExport = false;

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--bytes' && args[i + 1]) {
    bytes = Number(args[++i]);
    continue;
  }
  if (a === '--format' && args[i + 1]) {
    format = args[++i];
    continue;
  }
  if (a === '--name' && args[i + 1]) {
    envName = args[++i];
    continue;
  }
  if (a === '--export') {
    doExport = true;
    continue;
  }
  if (a === '--help' || a === '-h') {
    printUsage();
    process.exit(0);
  }
}

if (!Number.isFinite(bytes) || bytes <= 0) {
  console.error('Invalid bytes value');
  process.exit(1);
}

const buf = crypto.randomBytes(bytes);

function toBase64Url(buffer) {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

let out;
if (format === 'hex') out = buf.toString('hex');
else if (format === 'base64') out = buf.toString('base64');
else out = toBase64Url(buf);

console.log('Generated encryption key:');
console.log(out);
console.log('');
if (doExport) {
  console.log('Export command:');
  console.log(`export ${envName}='${out}'`);
  console.log('');
}
console.log('Tips:');
console.log('- Use this value to set the ENCRYPTION_MASTER_SECRET environment variable for your Supabase functions or deployment (Vercel, Netlify, etc.).');
console.log("- To set a Supabase secret locally, use: 'supabase secrets set ENCRYPTION_MASTER_SECRET=<value>' or set in your host provider's secret manager.");
