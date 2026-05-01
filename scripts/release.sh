#!/usr/bin/env bash
set -euo pipefail

# Validate state
if [[ -n "$(git status --porcelain)" ]]; then
  echo "ERROR: working tree is not clean. Commit or stash changes."
  exit 1
fi

if [[ "$(git rev-parse --abbrev-ref HEAD)" != "main" ]]; then
  echo "ERROR: must be on main branch."
  exit 1
fi

git pull --rebase

# Get bump type from arg
BUMP="${1:-patch}"
if [[ "$BUMP" != "patch" && "$BUMP" != "minor" && "$BUMP" != "major" ]]; then
  echo "Usage: $0 [patch|minor|major]"
  exit 1
fi

# Bump version, create commit, create tag, push
npm version "$BUMP" -m "chore(release): bump to %s"
git push origin main
git push origin --tags

echo "Release tag pushed. GitHub Actions will handle the rest."
echo "Monitor progress at: https://github.com/niktyan/b787-calculator/actions"
