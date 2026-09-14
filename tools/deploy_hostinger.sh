#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${HOSTINGER_DEPLOY_WEBHOOK:-}" ]]; then
  echo '::error::HOSTINGER_DEPLOY_WEBHOOK is not configured; no site was deployed.'
  exit 1
fi

if [[ "$(git rev-parse HEAD)" != "$VALIDATED_SHA" ]]; then
  echo 'A newer commit exists; this validated commit will not be deployed.'
  exit 0
fi

jq -n \
  --arg ref 'refs/heads/main' \
  --arg after "$VALIDATED_SHA" \
  --arg full_name "$GITHUB_REPOSITORY" \
  '{ref: $ref, after: $after, repository: {full_name: $full_name}}' |
  curl --fail --show-error --silent --retry 3 \
    --header 'Content-Type: application/json' \
    --header 'X-GitHub-Event: push' \
    --data-binary @- "$HOSTINGER_DEPLOY_WEBHOOK"

echo "Hostinger deployment requested for $VALIDATED_SHA" >> "$GITHUB_STEP_SUMMARY"
