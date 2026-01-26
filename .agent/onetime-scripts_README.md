# Script helpers

## generate-encryption-key.js

Generates a cryptographically secure random value suitable for use as an encryption master secret.

Usage:

```
node scripts/generate-encryption-key.js --bytes 32 --format base64url --name ENCRYPTION_MASTER_SECRET --export
```

Options:

- `--bytes N` — number of random bytes to generate (default: 32)
- `--format base64url|base64|hex` — output format (default: base64url)
- `--name NAME` — optional env var name to show in export commands (default: ENCRYPTION_MASTER_SECRET)
- `--export` — print an `export NAME=value` command

Examples:

```
npm run generate-encryption-key
node scripts/generate-encryption-key.js --bytes 48 --format hex
```
