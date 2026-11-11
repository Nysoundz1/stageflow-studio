#!/usr/bin/env zsh
set -e

REPO_URL="$1"

if [ -z "$REPO_URL" ]; then
  echo "Usage: ./push_to_github.sh <https://github.com/USERNAME/REPO.git>"
  exit 1
fi

if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$REPO_URL"
else
  git remote add origin "$REPO_URL"
fi

git branch -M main
git push -u origin main
echo "✅ Successfully pushed StageFlow Studio (main) to $REPO_URL"
