# Backup Cron: backup-envs-ymls

Purpose
- Simple daily backup of all `.env`, `.yml`, and `.yaml` files under a repository and common system locations.

What it runs
- Script: `scripts/backup-envs-ymls.sh`
- Intended installed location: `/usr/local/bin/backup-envs-ymls.sh`
- Cron file: `/etc/cron.d/backup-envs-ymls`
- Example cron entry:

  30 3 * * * root /usr/local/bin/backup-envs-ymls.sh --repo /path/to/repo --backup-dir /var/backups/envs-ymls >> /var/log/backup-envs-ymls.log 2>&1

Notes
- `zip` is required; the script will attempt to auto-install when running as `root`.
 - `zip` is required; the script will attempt to auto-install when running as `root`.
 - Encryption: the script supports `age`. To enable encryption via keyfile in cron, use:

```sh
30 3 * * * root AGE_KEYFILE=/root/backup-keys/age.key /usr/local/bin/backup-envs-ymls.sh --repo /path/to/repo --backup-dir /var/backups/envs-ymls >> /var/log/backup-envs-ymls.log 2>&1
```
- By default the script excludes `node_modules`, `.git`, `backup`, and `dist` directories. Adjust exclusions in script if needed.

Install & test
- Copy and make executable:

```sh
sudo cp scripts/backup-envs-ymls.sh /usr/local/bin/
sudo chmod +x /usr/local/bin/backup-envs-ymls.sh
sudo mkdir -p /var/backups/envs-ymls
sudo touch /var/log/backup-envs-ymls.log
```

- Create cron file (example):

```sh
sudo tee /etc/cron.d/backup-envs-ymls > /dev/null <<'EOF'
30 3 * * * root /usr/local/bin/backup-envs-ymls.sh --repo /path/to/repo --backup-dir /var/backups/envs-ymls >> /var/log/backup-envs-ymls.log 2>&1
EOF
sudo chmod 644 /etc/cron.d/backup-envs-ymls
```

- Manual run to test:

```sh
sudo /usr/local/bin/backup-envs-ymls.sh --repo /path/to/repo --backup-dir /var/backups/envs-ymls
ls -l /var/backups/envs-ymls
tail -n 200 /var/log/backup-envs-ymls.log
```

Retention & security recommendations
- Add retention rules to delete archives older than a threshold (e.g., 30 days).
- Treat backups as secrets; encrypt before off-site copy.
