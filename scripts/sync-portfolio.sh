#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

if [ -f .git/MERGE_HEAD ]; then
  echo "Merge in progress. Resolve or abort before syncing."
  exit 1
fi

node scripts/build-gallery.mjs

if ! git status --porcelain | grep -q .; then
  echo "Nothing to commit."
  exit 0
fi

if ! git rev-parse --abbrev-ref --symbolic-full-name "@{u}" >/dev/null 2>&1; then
  echo "No upstream configured. Set one with: git push -u origin main"
  exit 1
fi

git add -A
if git diff --cached --quiet; then
  echo "Nothing to commit."
  exit 0
fi

read -r -p "Commit message (default: Update portfolio): " message
if [ -z "${message// }" ]; then
  message="Update portfolio"
fi

git commit -m "$message"
git push
