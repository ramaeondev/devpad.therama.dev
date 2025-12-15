#!/usr/bin/env bash
set -euo pipefail

# Pull plain files from remote server (no tar/zip archives). Independent of other scripts.
# Collects: all .env, .yml/.yaml files, DB schema (pg_dump -s), and supabase functions directory.
# Usage: ./pull-files.sh --host root@host --key ~/.ssh/key --out ./.backup_temp [--timeout 600 --interval 5]

HOST="root@157.245.105.249"
KEY="~/.ssh/devpad-digiocean"
OUT_DIR="./.backup_temp"
RETRY_TIMEOUT_SECONDS=${RETRY_TIMEOUT_SECONDS:-60}
RETRY_INTERVAL_SECONDS=${RETRY_INTERVAL_SECONDS:-5}

while [[ ${1:-} != "" ]]; do
  case "$1" in
    --host) shift; HOST="$1"; shift;;
    --key) shift; KEY="$1"; shift;;
    --out) shift; OUT_DIR="$1"; shift;;
    --timeout) shift; RETRY_TIMEOUT_SECONDS="$1"; shift;;
    --interval) shift; RETRY_INTERVAL_SECONDS="$1"; shift;;
    -h|--help) echo "Usage: $0 --host root@host --key ~/.ssh/key --out ./.backup_temp"; exit 0;;
    *) echo "Unknown arg: $1"; exit 1;;
  esac
done

SSH_OPTS=( -i "$KEY" -o StrictHostKeyChecking=accept-new -o ConnectTimeout=10 -o BatchMode=yes )

# Safety and prepare out dir
if [[ -z "$OUT_DIR" || "$OUT_DIR" == "/" ]]; then
  echo "Refusing to operate on empty or root OUT_DIR='${OUT_DIR}'." >&2
  exit 1
fi
if [[ -d "$OUT_DIR" ]]; then
  echo "Cleaning existing $OUT_DIR"
  rm -rf "$OUT_DIR"/*
else
  mkdir -p "$OUT_DIR"
fi

# add to .gitignore
GITIGNORE_PATH="${OUT_DIR#./}"
if ! grep -qxF "$GITIGNORE_PATH" .gitignore 2>/dev/null; then
  echo "$GITIGNORE_PATH" >> .gitignore || true
fi

WORKDIR="$OUT_DIR/pull-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$WORKDIR/host"
mkdir -p "$WORKDIR/functions"
mkdir -p "$WORKDIR/containers"

echo "Pulling plain files to $WORKDIR"

# Wait for SSH up (retry)
start_ts=$(date +%s)
while true; do
  if ssh "${SSH_OPTS[@]}" "$HOST" -- true 2>/dev/null; then
    break
  fi
  echo "SSH still not available; retrying in ${RETRY_INTERVAL_SECONDS}s..."
  sleep "$RETRY_INTERVAL_SECONDS"
  if (( $(date +%s) - start_ts > RETRY_TIMEOUT_SECONDS )); then
    echo "SSH unreachable after ${RETRY_TIMEOUT_SECONDS}s" >&2
    exit 1
  fi
done

# 1) Host files: find and copy each matching file preserving path
SEARCH_DIRS=("." "/opt" "/srv" "/etc" "/root" "/var/www")
PATTERN='-iname "*.env" -o -iname "*.yml" -o -iname "*.yaml"'
echo "Finding host .env/.yml files on remote"
REMOTE_FIND_CMD='for d in ${SEARCH_DIRS}; do :; done'

# Build remote find command to run on server
REMOTE_FIND=""
for d in "${SEARCH_DIRS[@]}"; do
  REMOTE_FIND+="if [ -d \"$d\" ]; then find \"$d\" -maxdepth 6 -type f \( -iname '*.env' -o -iname '*.yml' -o -iname '*.yaml' \) -print0; fi; "
done

echo "Collecting host files..."
ssh "${SSH_OPTS[@]}" "$HOST" -- bash -s <<'REMOTE' | while IFS= read -r -d '' remotefile; do
for d in /root /opt /srv /etc /var/www .; do
  if [ -d "$d" ]; then
    find "$d" -maxdepth 6 -type f \( -iname '*.env' -o -iname '*.yml' -o -iname '*.yaml' \) -print0
  fi
done
REMOTE
  relpath=${remotefile#/}
  dest="$WORKDIR/host/$relpath"
  mkdir -p "$(dirname "$dest")"
  echo "Copying $remotefile -> $dest"
  # copy with retry
  copy_success=0
  for try in 1 2 3 4 5; do
    if scp "${SSH_OPTS[@]}" "$HOST:$remotefile" "$dest" 2>/dev/null; then
      copy_success=1; break
    fi
    echo "scp failed (attempt $try); retrying in 2s..."
    sleep 2
  done
  if [[ $copy_success -ne 1 ]]; then
    echo "scp failed for $remotefile; falling back to ssh cat"
    for try in 1 2 3; do
      if ssh "${SSH_OPTS[@]}" "$HOST" -- bash -lc "cat \"$remotefile\"" > "$dest" 2>/dev/null; then copy_success=1; break; fi
      echo "ssh cat failed (attempt $try); retrying in 2s..."
      sleep 2
    done
  fi
  if [[ $copy_success -ne 1 ]]; then
    echo "Failed to copy $remotefile after retries; skipping"
  fi
done

# 2) Supabase functions directory (first match)
echo "Searching for supabase functions dir"
FIRST_FUNC_DIR=$(ssh "${SSH_OPTS[@]}" "$HOST" -- 'for p in /root /opt /srv /var/www; do [ -d "$p" ] && find "$p" -type d -path "*/supabase/functions*" -prune -print; done | head -n1' | tr -d '\r' || true)
if [[ -n "$FIRST_FUNC_DIR" ]]; then
  echo "Found functions dir: $FIRST_FUNC_DIR"
  mkdir -p "$WORKDIR/functions"
  scp -r "${SSH_OPTS[@]}" "$HOST:$FIRST_FUNC_DIR" "$WORKDIR/functions/" || (ssh "${SSH_OPTS[@]}" "$HOST" -- "tar -C \"$FIRST_FUNC_DIR\" -cf - ." | tar -C "$WORKDIR/functions" -xf -)
else
  echo "No functions dir found"
fi

# 3) Container envs and in-container .env files
echo "Collecting container envs and any in-container .env files"
if ssh "${SSH_OPTS[@]}" "$HOST" -- command -v docker >/dev/null 2>&1; then
  CONTAINERS=$(ssh "${SSH_OPTS[@]}" "$HOST" -- docker ps -aq || true)
  for CID in $CONTAINERS; do
    NAME=$(ssh "${SSH_OPTS[@]}" "$HOST" -- docker inspect --format '{{.Name}}' "$CID" 2>/dev/null | sed 's#^/##' || true)
    SAFE_NAME=${NAME:-$CID}
    TARGET_DIR="$WORKDIR/containers/$SAFE_NAME"
    mkdir -p "$TARGET_DIR"
    echo "Saving env vars for $SAFE_NAME"
    ssh "${SSH_OPTS[@]}" "$HOST" -- docker inspect --format '{{range $index, $value := .Config.Env}}{{$value}}\n{{end}}' "$CID" > "$TARGET_DIR/container-envs.txt" || true
    # find .env files in container
    FILES=$(ssh "${SSH_OPTS[@]}" "$HOST" -- docker exec "$CID" sh -c 'find / -xdev -type f -name "*.env" -o -name "env" 2>/dev/null || true' || true)
    if [[ -n "$FILES" ]]; then
      while IFS= read -r fpath; do
        if [[ -z "$fpath" ]]; then continue; fi
        # transform remote path to local path under container dir
        localrel=$(echo "$fpath" | sed 's|^/||')
        localdest="$TARGET_DIR/$localrel"
        mkdir -p "$(dirname "$localdest")"
        echo "Copying in-container $fpath -> $localdest"
        ssh "${SSH_OPTS[@]}" "$HOST" -- docker exec "$CID" sh -c "cat \"$fpath\"" > "$localdest" || true
      done <<< "$FILES"
    fi
  done
else
  echo "Docker not available on remote; skipping container files"
fi

# 4) DB schema (pg_dump -s) if SUPABASE_DB_URL found
echo "Checking for SUPABASE_DB_URL on remote"
DBURL=$(ssh "${SSH_OPTS[@]}" "$HOST" -- bash -lc '(printenv SUPABASE_DB_URL 2>/dev/null || (for f in /root/.env /var/www/devpad/.env /srv/devpad/.env /opt/devpad/.env ./ .env; do [ -f "$f" ] && grep -E "^SUPABASE_DB_URL=" "$f" | sed -E "s/^SUPABASE_DB_URL="?(.*)"?$/\1/" && break; done))' | tr -d '\r' || true)
if [[ -n "$DBURL" ]]; then
  echo "Found DB URL; performing schema dump"
  if [[ "$DBURL" =~ ^postgres ]]; then
    noproto=${DBURL#*://}
    userpass=${noproto%%@*}
    hostdb=${noproto#*@}
    hostport=${hostdb%%/*}
    dbname=${hostdb#*/}
    user=${userpass%%:*}
    pass=${userpass#*:}
    echo "Streaming schema dump"
    ssh "${SSH_OPTS[@]}" "$HOST" -- bash -lc "PGPASSWORD=\"$pass\" pg_dump -s -h \"${hostport%%:*}\" -p \"${hostport#*:}\" -U \"$user\" \"$dbname\"" > "$WORKDIR/db-schema.sql"
    echo "Wrote $WORKDIR/db-schema.sql"
  else
    echo "DB URL isn't postgres; skipping"
  fi
else
  echo "No DB URL found on remote; skipping DB schema dump"
fi

echo "Done. Files saved under: $WORKDIR"

exit 0
