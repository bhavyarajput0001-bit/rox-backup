#!/bin/bash
# Rox Auto-Sync Script
# Syncs Rox repo to git backup remote every 30 minutes
# Repo lives in iCloud: ~/Library/Mobile Documents/com~apple~CloudDocs/Rox

REPO_DIR="$HOME/Library/Mobile Documents/com~apple~CloudDocs/Rox"
BACKUP_REMOTE="backup"
LOG_FILE="$HOME/.hermes/logs/rox-sync.log"

mkdir -p "$(dirname "$LOG_FILE")"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

log "=== Rox Auto-Sync Started ==="

cd "$REPO_DIR" || { log "ERROR: Cannot cd to $REPO_DIR"; exit 1; }

if [ ! -d ".git" ]; then
  log "ERROR: Not a git repository"
  exit 1
fi

CHANGED=$(git status --porcelain)
if [ -z "$CHANGED" ]; then
  log "No changes detected. Skipping sync."
  exit 0
fi

git add -A 2>/dev/null

if git diff --cached --quiet; then
  log "No changes to commit."
  exit 0
fi

COMMIT_MSG="auto-sync: $(date '+%Y-%m-%d %H:%M')"
git commit -m "$COMMIT_MSG" >/dev/null 2>&1

if [ $? -eq 0 ]; then
  git push "$BACKUP_REMOTE" main 2>&1 | tee -a "$LOG_FILE"
  if [ $? -eq 0 ]; then
    log "SUCCESS: Pushed $(git rev-parse --short HEAD)"
  else
    log "ERROR: Push failed"
  fi
else
  log "ERROR: Commit failed"
fi

log "=== Sync Complete ==="