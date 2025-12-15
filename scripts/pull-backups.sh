#!/usr/bin/env bash
set -euo pipefail

# Pull all backups from remote server directly to this local machine (no unencrypted files written on server)
# Usage: ./pull-backups.sh --host root@host --key ~/.ssh/key --out ./backup-temp

HOST="root@157.245.105.249"
KEY="~/.ssh/devpad-digiocean"
# Default local output dir (dotfolder for gitignore)
OUT_DIR="./.backup_temp"
TIMESTAMP=$(date -u +"%Y%m%dT%H%M%SZ")
WORKDIR="$OUT_DIR/pull-$TIMESTAMP"

while [[ ${1:-} != "" ]]; do
  case "$1" in
    --host) shift; HOST="$1"; shift;;
    --key) shift; KEY="$1"; shift;;
    --out) shift; OUT_DIR="$1"; shift;;
    --timeout) shift; RETRY_TIMEOUT_SECONDS="$1"; shift;;
    --interval) shift; RETRY_INTERVAL_SECONDS="$1"; shift;;
    --forever) RETRY_FOREVER=1; shift;;
    -h|--help) echo "Usage: $0 --host root@host --key ~/.ssh/key --out ./backup-temp"; exit 0;;
    *) echo "Unknown arg: $1"; exit 1;;
  esac
done

# Safety: ensure OUT_DIR is not empty or root
if [[ -z "$OUT_DIR" || "$OUT_DIR" == "/" ]]; then
  echo "Refusing to operate on empty or root OUT_DIR='${OUT_DIR}'." >&2
  exit 1
fi

# Ensure OUT_DIR exists and is clean (remove old artifacts before running)
if [[ -d "$OUT_DIR" ]]; then
  echo "Cleaning existing $OUT_DIR"
  rm -rf "$OUT_DIR"/*
else
  mkdir -p "$OUT_DIR"
fi
mkdir -p "$WORKDIR"

# ensure out dir is in .gitignore (strip leading ./)
GITIGNORE_PATH="${OUT_DIR#./}"
if ! grep -qxF "$GITIGNORE_PATH" .gitignore 2>/dev/null; then
  echo "$GITIGNORE_PATH" >> .gitignore || true
fi

SSH_OPTS=( -i "$KEY" -o StrictHostKeyChecking=accept-new -o ConnectTimeout=10 -o BatchMode=yes )

RETRY_TIMEOUT_SECONDS=${RETRY_TIMEOUT_SECONDS:-600}
RETRY_INTERVAL_SECONDS=${RETRY_INTERVAL_SECONDS:-5}
RETRY_FOREVER=${RETRY_FOREVER:-0}

echo "Pulling backups to $WORKDIR"

# connectivity retry loop: wait until SSH connects (or timeout/forever)
start_ts=$(date +%s)
attempt=0
while true; do
  attempt=$((attempt+1))
  if ssh "${SSH_OPTS[@]}" "$HOST" -- true 2>/dev/null; then
    echo "SSH connection established to $HOST (attempt $attempt)"
    break
  fi
  echo "SSH connect attempt $attempt failed; retrying in ${RETRY_INTERVAL_SECONDS}s..."
  sleep "$RETRY_INTERVAL_SECONDS"
  if [[ "$RETRY_FOREVER" -eq 1 ]]; then
    continue
  fi
  now_ts=$(date +%s)
  elapsed=$((now_ts - start_ts))
  if [[ $elapsed -ge $RETRY_TIMEOUT_SECONDS ]]; then
    echo "Unable to connect to $HOST over SSH after ${elapsed}s; aborting"
    exit 1
  fi
done

remote_tar_stream() {
  local name="$1"; shift
  local remote_cmd="$*"
  local dest="$WORKDIR/$name"
  echo "Streaming remote archive for $name -> $dest.tgz"
  ssh "${SSH_OPTS[@]}" "$HOST" -- bash -lc "$remote_cmd" > "$dest.tgz"
  echo "Wrote $dest.tgz"
}

# 1) Host docker-compose and repo ymls + .env files
echo "Collecting host docker-compose YAMLs and .env files"
REMOTE_CMD='cd / || true; for d in /root /opt /srv /etc/docker .; do if [ -d "$d" ]; then (cd "$d" 2>/dev/null; find . -maxdepth 6 -type f \( -iname "docker-compose*.yml" -o -iname "*.docker*.yml" -o -iname "*.yml" -o -iname "*.yaml" -o -iname "*.env" \) -print0; ); fi; done | tar --null -T - --ignore-failed-read -czf -'
remote_tar_stream "host-yml-envs" "$REMOTE_CMD"

# 2) Repo/function code: search for supabase/functions directories and stream them
echo "Collecting supabase functions (if any)"
FIRST_FUNC_DIR=$(ssh "${SSH_OPTS[@]}" "$HOST" -- 'for p in /root /opt /srv /var/www; do [ -d "$p" ] && find "$p" -type d -path "*/supabase/functions*" -prune -print; done | head -n1' | tr -d '\r' || true)
if [[ -n "$FIRST_FUNC_DIR" ]]; then
  echo "Found functions dir: $FIRST_FUNC_DIR"
  remote_tar_stream "edge-functions" "cd \"$FIRST_FUNC_DIR\" && tar -czf - ."
else
  echo "No supabase functions dir found; skipping"
fi

# 3) Container envs and files: stream per-container env output and any .env files discovered inside containers
echo "Collecting container envs and in-container .env files"
echo "Collecting container envs and in-container .env files"
CONTAINERS=$(ssh "${SSH_OPTS[@]}" "$HOST" -- docker ps -aq || true)
if [[ -n "$CONTAINERS" ]]; then
  # Run a single remote command to emit container sections, to avoid many SSH connections
  ssh "${SSH_OPTS[@]}" "$HOST" -- bash -lc "bash -s" <<'REMOTE' | while IFS= read -r line; do
for cid in $(docker ps -aq); do
  name=$(docker inspect --format '{{.Name}}' "$cid" 2>/dev/null | sed 's#^/##')
  echo "---BEGIN_CONTAINER---$cid:$name"
  docker exec "$cid" env || true
  echo "---ENVFILES---"
  docker exec "$cid" sh -c 'find / -xdev -type f -name "*.env" -o -name "env" 2>/dev/null || true' || true
  echo "---END_CONTAINER---"
done
REMOTE
  
    case "$line" in
      ---BEGIN_CONTAINER---*)
        meta=${line#---BEGIN_CONTAINER---}
        CID=${meta%%:*}
        NAME=${meta#*:}
        SAFE_NAME=$(echo "${NAME:-$CID}" | tr '/' '_' | tr ' ' '_')
        OUTFILE="$WORKDIR/container-${SAFE_NAME}-${CID}.env"
        echo "" > "$OUTFILE"
        mode=env
        ;;
      ---ENVFILES---)
        mode=files
        ;;
      ---END_CONTAINER---)
        mode=idle
        ;;
      *)
        if [[ ${mode:-} == env ]]; then
          echo "$line" >> "$OUTFILE"
        elif [[ ${mode:-} == files ]]; then
          if [[ -n "$line" ]]; then
            safepath=$(echo "$line" | sed "s|/|_|g" | sed "s|^_||")
            ssh "${SSH_OPTS[@]}" "$HOST" -- docker exec "$CID" sh -c "cat \"$line\"" > "$WORKDIR/container-${SAFE_NAME}-${safepath}" || true
          fi
        fi
        ;;
    esac
  done
else
  echo "No containers found on remote"
fi

# 4) DB dump (attempt to detect DB URL and stream pg_dump)
echo "Attempting to fetch DB dump"
GET_DBURL_CMD='(printenv SUPABASE_DB_URL 2>/dev/null || (for f in /root/.env /var/www/devpad/.env /srv/devpad/.env /opt/devpad/.env ./ .env; do [ -f "$f" ] && grep -E "^SUPABASE_DB_URL=" "$f" | sed -E "s/^SUPABASE_DB_URL=\"?(.*)\"?$/\1/" && break; done))'
DBURL=$(ssh "${SSH_OPTS[@]}" "$HOST" -- bash -lc "$GET_DBURL_CMD" | tr -d '\r' || true)
if [[ -n "$DBURL" ]]; then
  echo "Found DB URL; streaming pg dump"
  # parse postgresql://user:pass@host:port/dbname or postgres://
  if [[ "$DBURL" =~ ^postgres ]]; then
    # extract components
    # remove protocol
    noproto=${DBURL#*://}
    userpass=${noproto%%@*}
    hostdb=${noproto#*@}
    hostport=${hostdb%%/*}
    dbname=${hostdb#*/}
    user=${userpass%%:*}
    pass=${userpass#*:}
    host=${hostport%%:*}
    port=${hostport#*:}
    echo "Streaming DB dump for $dbname@$host:$port"
    ssh "${SSH_OPTS[@]}" "$HOST" -- bash -lc "PGPASSWORD=\"$pass\" pg_dump -Fc -h \"$host\" -p \"$port\" -U \"$user\" \"$dbname\"" > "$WORKDIR/db-dump-$TIMESTAMP.dump"
    echo "Wrote $WORKDIR/db-dump-$TIMESTAMP.dump"
  else
    echo "DB URL is not postgres; skipping DB dump"
  fi
else
  echo "No DB URL found on remote; skipping DB dump"
fi

echo "All done. Local artifacts in: $WORKDIR"

echo "You can inspect or encrypt/archive the output locally as needed."

exit 0
