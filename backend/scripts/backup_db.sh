#!/bin/bash
set -e

BACKUP_DIR="db_backups"
TIMESTAMP=$(date +"%Y%m%d%H%M")
OUTPUT_FILE="$BACKUP_DIR/backup-$TIMESTAMP.dump"

RETENTION_COUNT=7

mkdir -p "$BACKUP_DIR"

pg_dump \
  --format=custom \
  --no-owner \
  --no-privileges \
  "$DATABASE_URL" > "$OUTPUT_FILE"

echo "Backup completed: $OUTPUT_FILE"

echo "Applying retention policy (keep last $RETENTION_COUNT backups)..."

ls -1t "$BACKUP_DIR"/backup-*.dump 2>/dev/null | tail -n +$((RETENTION_COUNT + 1)) | xargs -r rm -f

echo "Retention cleanup done"