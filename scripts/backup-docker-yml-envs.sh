#!/usr/bin/env bash
set -euo pipefail

# Backup Docker Compose YAMLs and .env files from host and containers.
# Usage:
#   ./backup-docker-yml-envs.sh [--repo /path/to/repo] [--backup-dir /path/to/backups]
# By default, it will run against the repository root and save backups to ../backup

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="$ROOT_DIR/backup"
ADDITIONAL_SEARCH_DIRS=("/opt" "/srv" "/etc/docker" "/root")

while [[ ${1:-} != "" ]]; do
  case "$1" in
    --repo) shift; ROOT_DIR="$1"; shift;;
    --backup-dir) shift; BACKUP_DIR="$1"; shift;;
    -h|--help) echo "Usage: $0 [--repo /path] [--backup-dir /path]"; exit 0;;
    *) echo "Unknown arg: $1"; exit 1;;
  esac
done

mkdir -p "$BACKUP_DIR"

NOW=$(date -u +"%Y%m%dT%H%M%SZ")
TMP_DIR=$(mktemp -d)
OUT_BASENAME="docker-all-backup-$NOW"
OUT_ZIP="$BACKUP_DIR/$OUT_BASENAME.zip"

echo "Backing up into $OUT_ZIP"

# 1) Collect docker-compose YAMLs and any yaml with docker in name from repo
echo "Finding host docker compose / yaml / .env files under $ROOT_DIR"
pushd "$ROOT_DIR" >/dev/null
  # capture docker compose files explicitly and all env files
  find . -type f \( -iname "docker-compose*.yml" -o -iname "docker-compose*.yaml" -o -iname "*docker*.yml" -o -iname "*docker*.yaml" -o -iname "*.env" \) -print | tr '\n' '\0' | xargs -0 -I{} bash -lc 'mkdir -p "$TMP_DIR/host"; cp --parents "{}" "$TMP_DIR/host" 2>/dev/null || true'
  # Also search additional dirs if available - avoid scanning large root by default
  for D in "${ADDITIONAL_SEARCH_DIRS[@]}"; do
    if [[ -d "$D" ]]; then
      echo "Searching $D for docker-compose/yaml/env files"
      find "$D" -maxdepth 4 -type f \( -iname "docker-compose*.yml" -o -iname "docker-compose*.yaml" -o -iname "*docker*.yml" -o -iname "*docker*.yaml" -o -iname "*.env" \) -print | tr '\n' '\0' | xargs -0 -I{} bash -lc 'mkdir -p "$TMP_DIR/host"; cp --parents "{}" "$TMP_DIR/host" 2>/dev/null || true'
    fi
  done
popd >/dev/null

# 2) Save docker container envs and any .env files inside containers
if command -v docker >/dev/null 2>&1; then
  CONTAINERS=$(docker ps -aq)
  if [[ -n "$CONTAINERS" ]]; then
    mkdir -p "$TMP_DIR/containers"
    echo "Found containers: $CONTAINERS"
    for CID in $CONTAINERS; do
      NAME=$(docker inspect --format '{{.Name}}' "$CID" 2>/dev/null | sed 's/^\///')
      CONTAINER_DIR="$TMP_DIR/containers/$NAME-$CID"
      mkdir -p "$CONTAINER_DIR"

      # 2a) Save environment variables as a .env-like file
      docker inspect --format '{{range $index, $value := .Config.Env}}{{$value}}\n{{end}}' "$CID" > "$CONTAINER_DIR/${NAME}-${CID}.env" || true

      # 2b) Find .env files inside container and copy them out
      # Use sh to avoid issues with Alpine vs Debian
      ENVFILES=$(docker exec "$CID" sh -c 'find / -xdev -type f -name "*.env" -o -name "env" 2>/dev/null || true' || true)
      if [[ -n "$ENVFILES" ]]; then
        echo "$ENVFILES" | while IFS= read -r fpath; do
          # skip /proc, /sys and large system dirs, keep to -xdev finds
          dest="$CONTAINER_DIR$(dirname "$fpath")"
          mkdir -p "$dest"
          docker cp "$CID":"$fpath" "$dest/" 2>/dev/null || true
        done
      fi
    done
  else
    echo "No running containers found. Skipping container backups."
  fi
else
  echo "Docker not installed or not available on PATH. Skipping container backups."
fi

# 3) Add list of docker-compose files and installed containers metadata
mkdir -p "$TMP_DIR/metadata"
docker ps -a --format '{{.ID}} {{.Image}} {{.Names}} {{.Status}}' > "$TMP_DIR/metadata/containers.txt" 2>/dev/null || true
docker images --format '{{.Repository}}:{{.Tag}} {{.ID}}' > "$TMP_DIR/metadata/images.txt" 2>/dev/null || true

ensure_zip() {
  if command -v zip >/dev/null 2>&1; then
    return 0
  fi

  # If running as root, attempt to install zip using common package managers
  if [[ $(id -u) -eq 0 ]]; then
    echo "zip not found. Attempting to install zip package as root..."
    if command -v apt-get >/dev/null 2>&1; then
      apt-get update -qq && apt-get install -y zip >/dev/null 2>&1 && return 0 || true
    fi
    if command -v yum >/dev/null 2>&1 || command -v dnf >/dev/null 2>&1; then
      PKG_MGR=$(command -v dnf >/dev/null 2>&1 && echo dnf || echo yum)
      $PKG_MGR install -y zip >/dev/null 2>&1 && return 0 || true
    fi
    if command -v apk >/dev/null 2>&1; then
      apk add --no-cache zip >/dev/null 2>&1 && return 0 || true
    fi
    if command -v pacman >/dev/null 2>&1; then
      pacman -Sy --noconfirm zip >/dev/null 2>&1 && return 0 || true
    fi
  fi

  echo "zip is not installed and could not be auto-installed. Please install 'zip' and re-run the script."
  return 1
}

if ! ensure_zip; then
  exit 1
fi

# 4) Create zip
pushd "$TMP_DIR" >/dev/null
  zip -r "$OUT_ZIP" . >/dev/null
popd >/dev/null

echo "Backup written to: $OUT_ZIP"

# Encrypt with age if available and a recipient/key is provided
AGE_KEYFILE="${AGE_KEYFILE-/root/backup-keys/age.key}"
AGE_RECIPIENT="${AGE_RECIPIENT-}" # can be a pubkey string like age1...

get_age_recipient() {
  if [[ -n "$AGE_RECIPIENT" ]]; then
    echo "$AGE_RECIPIENT"
    return 0
  fi
  if [[ -f "$AGE_KEYFILE" ]]; then
    if command -v age-keygen >/dev/null 2>&1; then
      age-keygen -y "$AGE_KEYFILE" 2>/dev/null || return 1
    fi
  fi
  return 1
}

encrypt_with_age() {
  if ! command -v age >/dev/null 2>&1; then
    echo "age binary not found; skipping encryption"
    return 1
  fi
  RECIPIENT=$(get_age_recipient) || true
  if [[ -z "$RECIPIENT" ]]; then
    echo "No AGE_RECIPIENT or AGE_KEYFILE public key available; skipping encryption"
    return 1
  fi

  OUT_ENC="${OUT_ZIP}.age"
  echo "Encrypting $OUT_ZIP -> $OUT_ENC"
  age -r "$RECIPIENT" -o "$OUT_ENC" "$OUT_ZIP" && rm -f "$OUT_ZIP"
  if [[ -f "$OUT_ENC" ]]; then
    echo "Encrypted backup written to: $OUT_ENC"
  else
    echo "Encryption failed for: $OUT_ZIP"
    return 1
  fi
}

encrypt_with_age || true

# 5) Cleanup
rm -rf "$TMP_DIR"
echo "Done"

exit 0
