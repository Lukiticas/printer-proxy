#!/usr/bin/env bash
set -euo pipefail

if [ -z "${1:-}" ]; then
  echo "Usage: scripts/release.sh <version|patch|minor|major>"
  exit 1
fi

ARG=$1
if [[ "$ARG" =~ ^(patch|minor|major)$ ]]; then
  npm version "$ARG" -m "chore: release %s"
else
  npm version "$ARG" -m "chore: release %s"
fi

git push
git push --tags

echo "Tagged and pushed. GitHub Actions will build the release."