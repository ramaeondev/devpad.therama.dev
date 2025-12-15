# Backup Cron: backup-docker-yml-envs

Purpose
- Daily backup of Docker Compose YAMLs and `.env` files from the host and running containers into a single zip archive.

What it runs
- Script: `scripts/backup-docker-yml-envs.sh`
- Installed location on server: `/usr/local/bin/backup-docker-yml-envs.sh`
- Cron file: `/etc/cron.d/backup-docker-yml-envs`
- Cron entry (installed):

  0 2 * * * root /usr/local/bin/backup-docker-yml-envs.sh --backup-dir /var/backups/docker-envs >> /var/log/backup-docker.log 2>&1

Dependencies & permissions
- `zip` is required. The script will attempt to auto-install `zip` if run as `root` and a package manager is available (apt, yum/dnf, apk, pacman). If you run as a non-root user, install `zip` manually.
- `docker` (optional): required if you want to extract `.env` files and env vars from running containers. Running as `root` or a user in the `docker` group is recommended when container inspection/copy is needed.
 - `docker` (optional): required if you want to extract `.env` files and env vars from running containers. Running as `root` or a user in the `docker` group is recommended when container inspection/copy is needed.
 - Encryption: the script supports `age`. To enable encryption via keyfile in cron, use:

```sh
0 2 * * * root AGE_KEYFILE=/root/backup-keys/age.key /usr/local/bin/backup-docker-yml-envs.sh --backup-dir /var/backups/docker-envs >> /var/log/backup-docker.log 2>&1
```

Install & enable (recommended for root)
1. Copy script to `/usr/local/bin` and make it executable:

```sh
sudo cp scripts/backup-docker-yml-envs.sh /usr/local/bin/
sudo chmod +x /usr/local/bin/backup-docker-yml-envs.sh
sudo mkdir -p /var/backups/docker-envs
sudo touch /var/log/backup-docker.log
sudo chown -R root:root /var/backups/docker-envs
```

2. Create the cron file (example):

```sh
sudo tee /etc/cron.d/backup-docker-yml-envs > /dev/null <<'EOF'
0 2 * * * root /usr/local/bin/backup-docker-yml-envs.sh --backup-dir /var/backups/docker-envs >> /var/log/backup-docker.log 2>&1
EOF
sudo chmod 644 /etc/cron.d/backup-docker-yml-envs
```

Alternative: add to root's crontab with `crontab -e` if you prefer user crontab entries.

Testing
- Run manually to verify behavior and outputs:

```sh
sudo /usr/local/bin/backup-docker-yml-envs.sh --backup-dir /var/backups/docker-envs
ls -l /var/backups/docker-envs
tail -n 200 /var/log/backup-docker.log
```

Retention & cleanup (example)
- Add a cron entry or a line in the script to remove old backups (e.g., older than 30 days):

```sh
# Delete backup files older than 30 days (run as root or backup owner)
find /var/backups/docker-envs -type f -name 'docker-all-backup-*' -mtime +30 -delete
```

Security & best practices
- Backups include `.env` files and environment variables; treat them as secrets.
- Encrypt archives before copying off-server (GPG or zip with password, or server-side encryption on the storage destination).
- Prefer pushing backups to secure off-site storage (S3 with restricted IAM role, dedicated backup server, etc.).

Off-site upload example (AWS S3 CLI)

```sh
# Ensure AWS CLI configured with appropriate credentials/role
aws s3 cp /var/backups/docker-envs/docker-all-backup-$(date -u +%Y%m%dT%H%M%SZ).zip s3://your-backup-bucket/devpad/ --storage-class STANDARD_IA
```

Troubleshooting
- Check cron and job logs: `tail -n 200 /var/log/backup-docker.log`
- Confirm cron is reading files in `/etc/cron.d` (system's cron daemon): `systemctl status cron` or `service cron status`
- Validate script permissions and that `/usr/local/bin/backup-docker-yml-envs.sh` is executable.
- If backups don't include container `.env` files, verify docker CLI access: `docker ps -a` and that the executing user can `docker exec` and `docker cp`.

Notes
- The script searches the repository root (by default where the script lives) and several common system paths (`/opt`, `/srv`, `/etc/docker`, `/root`). Use `--repo /path/to/repo` to override.
- The script will attempt to auto-install `zip` when run as `root`. If that fails or you prefer not to auto-install, install `zip` manually via your package manager.
