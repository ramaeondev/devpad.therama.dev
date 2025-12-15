#!/usr/bin/env bash
set -euo pipefail

# Pull remote backup to local temp folder (no encryption, remove remote copy)
# Usage: ./pull-backup-to-local.sh [--host root@1.2.3.4] [--key ~/.ssh/id_rsa] [--type docker|envs|both] [--local-dir ./backup-temp]

HOST="root@157.245.105.249"
KEY="~/.ssh/devpad-digiocean"
TYPE="both"
LOCAL_DIR="./backup-temp"
KEEP_REMOTE=0

while [[ ${1:-} != "" ]]; do
  case "$1" in
    --host) shift; HOST="$1"; shift;;
    --key) shift; KEY="$1"; shift;;
    --type) shift; TYPE="$1"; shift;;
    --local-dir) shift; LOCAL_DIR="$1"; shift;;
    --keep-remote) KEEP_REMOTE=1; shift;;
    -h|--help) echo "Usage: $0 [--host root@host] [--key ~/.ssh/key] [--type docker|envs|both] [--local-dir ./backup-temp] [--keep-remote]"; exit 0;;
    *) echo "Unknown arg: $1"; exit 1;;
  esac
done

mkdir -p "$LOCAL_DIR"

# Ensure local dir is in .gitignore for debugging
if ! grep -qxF "${LOCAL_DIR#/}" .gitignore 2>/dev/null; then
  echo "${LOCAL_DIR#/}" >> .gitignore || true
fi

SSH_OPTS=( -i "$KEY" -o StrictHostKeyChecking=accept-new -o ConnectTimeout=10 -o BatchMode=yes )

ssh_cmd() {
  ssh "${SSH_OPTS[@]}" "$HOST" -- "$@"
}

scp_from_remote() {
  local remote_path="$1"
  scp "${SSH_OPTS[@]}" "$HOST:$remote_path" "$LOCAL_DIR/"
}

fetch_one() {
  local which="$1"
  local remote_cmd=""
  local pattern=""
  case "$which" in
    docker)
      # set AGE_KEYFILE to a non-existent path to explicitly disable age encryption
      remote_cmd="AGE_RECIPIENT= AGE_KEYFILE=/nonexistent /usr/local/bin/backup-docker-yml-envs.sh --backup-dir /tmp"
      pattern="/tmp/docker-all-backup-*" ;;
    envs)
      remote_cmd="AGE_RECIPIENT= AGE_KEYFILE=/nonexistent /usr/local/bin/backup-envs-ymls.sh --backup-dir /tmp"
      pattern="/tmp/envs-ymls-backup-*" ;;
    *)
      echo "Unknown type: $which"; return 1 ;;
  esac

  echo "Running remote backup for: $which"
  ssh_cmd bash -lc "$remote_cmd"

  # find newest match (only accept .zip or .tar.gz)
  # Retry a few times to wait for the file to appear (handle slight remote delays)
  REMOTE_FILE=""
  for i in 1 2 3 4 5; do
    REMOTE_FILE=$(ssh_cmd bash -lc "f=\$(ls -1t ${pattern}.zip 2>/dev/null || true); if [ -z \"\$f\" ]; then f=\$(ls -1t ${pattern}.tar.gz 2>/dev/null || true); fi; if [ -z \"\$f\" ]; then f=\$(ls -1t ${pattern}.tar 2>/dev/null || true); fi; echo \"\$f\" | head -n1") || true
    if [[ -n "$REMOTE_FILE" ]]; then break; fi
    sleep 1
  done
  if [[ -z "$REMOTE_FILE" ]]; then
    echo "No remote file found for pattern $pattern"; return 1
  fi

  # Ensure we have an absolute /tmp path and acceptable extension
  if [[ ! "$REMOTE_FILE" =~ ^/tmp/.*\.(zip|tar\.gz|tar)$ ]]; then
    echo "Remote file found but doesn't match expected unencrypted backup file pattern: $REMOTE_FILE"; return 1
  fi

  echo "Found remote file: $REMOTE_FILE"
  echo "Copying to local: $LOCAL_DIR/"
  scp_from_remote "$REMOTE_FILE"

  if [[ $? -ne 0 ]]; then
    echo "scp failed for $REMOTE_FILE"; return 1
  fi

  if [[ $KEEP_REMOTE -eq 0 ]]; then
    echo "Removing remote file: $REMOTE_FILE"
    ssh -i "$KEY" -o StrictHostKeyChecking=accept-new "$HOST" -- rm -f "$REMOTE_FILE" || true
  else
    echo "Keeping remote file: $REMOTE_FILE"
  fi
}

case "$TYPE" in
  docker) fetch_one docker ;;
  envs) fetch_one envs ;;
  both) fetch_one docker && fetch_one envs ;;
  *) echo "Unknown type: $TYPE"; exit 1 ;;
esac

echo "Done. Local files in: $LOCAL_DIR"
