# Scripts

This folder contains developer and deployment scripts for DevPad.

## backup-docker-yml-envs.sh

This script collects all Docker Compose YAML files and `.env` files in the repository and several common host locations, extracts `.env` files and environment variables from running containers, and writes them into a single zip archive.

Usage
- Copy the script to `/usr/local/bin`, make it executable, and run:
  - `sudo cp scripts/backup-docker-yml-envs.sh /usr/local/bin/`
  - `sudo chmod +x /usr/local/bin/backup-docker-yml-envs.sh`
  - `sudo /usr/local/bin/backup-docker-yml-envs.sh --repo /path/to/repo --backup-dir /var/backups/docker-envs`


The script defaults to the repo root (where it lives) and will save a zip file into `backup/` under the repo unless you supply `--backup-dir`.

- Notes & Security
- Dependency: `zip` is required to create the backup archive. The script will attempt to auto-install `zip` when running as root and using a supported package manager (apt, dnf/yum, apk, pacman). If the installation fails or you're running the script as a non-root user, please install `zip` on the host manually.
- The script may need to run as `root` or a user with `docker` and read permissions for system directories.
 - The script may need to run as `root` or a user with `docker` and read permissions for system directories.
 - Encryption: set `AGE_RECIPIENT` (public key string) or `AGE_KEYFILE` (path to private key created with `age-keygen`) environment variable before running the scripts to enable automatic age encryption of the archive. Example:

```sh
export AGE_KEYFILE=/root/backup-keys/age.key
# or
export AGE_RECIPIENT="age1..."
```

The scripts will create `<archive>.age` and remove the plaintext `<archive>.zip` when encryption succeeds.

Pulling backups locally
 Run `npm run pull-backups` to stream all backups from the server directly to your local machine under `./.backup_temp/` (no unencrypted files are written on the server). The command will collect:
  - Host docker-compose YAMLs and `.env` files
  - In-container envs and `.env` files (streamed per container)
  - Supabase `functions` directory (if present)
  - PostgreSQL DB dump (if `SUPABASE_DB_URL` is detectable on the server)

Example: `npm run pull-backups`

Notes: The script uses SSH to stream data to the local machine; you can then encrypt and upload the artifacts (e.g., to S3) from your Mac.

Cron Sample
- See `scripts/cron/backup-docker-yml-envs.cron` for a cron example. The suggested schedule runs daily at 02:00.
