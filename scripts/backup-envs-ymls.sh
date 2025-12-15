#!/usr/bin/env bash
set -euo pipefail

# Simple backup of all .env, .yml and .yaml files under a repository and common system dirs.
# Usage: ./backup-envs-ymls.sh [--repo /path/to/repo] [--backup-dir /path/to/backups]

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="$ROOT_DIR/backup"
EXCLUDE_DIRS=("node_modules" ".git" "backup" "dist")
ADDITIONAL_SEARCH_DIRS=("/opt" "/srv" "/etc" "/root")

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
OUT_BASENAME="envs-ymls-backup-$NOW"
OUT_ZIP="$BACKUP_DIR/$OUT_BASENAME.zip"

ensure_zip() {
  if command -v zip >/dev/null 2>&1; then
    return 0
  fi
  if [[ $(id -u) -eq 0 ]]; then
    echo "zip not found. Attempting to install zip..."
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
  echo "zip is not installed. Please install 'zip' and re-run the script." >&2
  return 1
}

if ! ensure_zip; then
  exit 1
fi

echo "Collecting .env and yml files under $ROOT_DIR"
pushd "$ROOT_DIR" >/dev/null
  # Find patterns, exclude common large dirs (using -prune)
  PRUNE_EXPR=""
  for d in "${EXCLUDE_DIRS[@]}"; do
    PRUNE_EXPR+=" -path './$d' -o"
  done
  # remove trailing -o
  PRUNE_EXPR=${PRUNE_EXPR% -o}

  # Run find with prune
  if [[ -n "$PRUNE_EXPR" ]]; then
    find . \( $PRUNE_EXPR \) -prune -o -type f \( -iname "*.env" -o -iname "*.yml" -o -iname "*.yaml" \) -print0 | xargs -0 -I{} bash -lc 'mkdir -p "$TMP_DIR/host"; cp --parents "{}" "$TMP_DIR/host" 2>/dev/null || true'
  else
    find . -type f \( -iname "*.env" -o -iname "*.yml" -o -iname "*.yaml" \) -print0 | xargs -0 -I{} bash -lc 'mkdir -p "$TMP_DIR/host"; cp --parents "{}" "$TMP_DIR/host" 2>/dev/null || true'
  fi
popd >/dev/null

# Also search additional system dirs (shallow)
for D in "${ADDITIONAL_SEARCH_DIRS[@]}"; do
  if [[ -d "$D" ]]; then
    echo "Searching $D for env/yml files"
    find "$D" -maxdepth 3 -type f \( -iname "*.env" -o -iname "*.yml" -o -iname "*.yaml" \) -print0 | xargs -0 -I{} bash -lc 'mkdir -p "$TMP_DIR/host"; cp --parents "{}" "$TMP_DIR/host" 2>/dev/null || true'
  fi
done

mkdir -p "$TMP_DIR/metadata"
echo "repo:$ROOT_DIR" > "$TMP_DIR/metadata/source.txt"
date -u +"%Y-%m-%dT%H:%M:%SZ" > "$TMP_DIR/metadata/timestamp.txt"

pushd "$TMP_DIR" >/dev/null
zip -r "$OUT_ZIP" . >/dev/null
popd >/dev/null

echo "Backup written to: $OUT_ZIP"

# Encrypt with age if available and a recipient/key is provided
AGE_KEYFILE="${AGE_KEYFILE-/root/backup-keys/age.key}"
AGE_RECIPIENT="${AGE_RECIPIENT-}"

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

rm -rf "$TMP_DIR"
exit 0
