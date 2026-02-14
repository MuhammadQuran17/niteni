#!/usr/bin/env bash
# GitLab CI helper script for running Gemini code review
# This script can be used directly in .gitlab-ci.yml or sourced by other CI configurations.
#
# Usage:
#   ./scripts/ci-review.sh [--mode mr|diff] [--fail-on-critical]
#
# Required environment variables:
#   GEMINI_API_KEY        - Gemini API key
#   GITLAB_TOKEN          - GitLab access token (or CI_JOB_TOKEN in CI)
#   CI_PROJECT_ID         - GitLab project ID
#   CI_MERGE_REQUEST_IID  - Merge request IID (for MR mode)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

MODE="mr"
FAIL_ON_CRITICAL="false"

while [[ $# -gt 0 ]]; do
  case $1 in
    --mode)
      MODE="$2"
      shift 2
      ;;
    --fail-on-critical)
      FAIL_ON_CRITICAL="true"
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

echo "=========================================="
echo "  Niteni - Code Review"
echo "=========================================="
echo "Mode: $MODE"
echo "Project ID: ${CI_PROJECT_ID:-not set}"
echo "MR IID: ${CI_MERGE_REQUEST_IID:-not set}"
echo "=========================================="

# Check required environment variables
if [ -z "${GEMINI_API_KEY:-}" ]; then
  echo "ERROR: GEMINI_API_KEY is not set"
  exit 1
fi

if [ -z "${GITLAB_TOKEN:-${CI_JOB_TOKEN:-}}" ]; then
  echo "ERROR: GITLAB_TOKEN or CI_JOB_TOKEN is not set"
  exit 1
fi

# Set GITLAB_TOKEN from CI_JOB_TOKEN if not explicitly set
export GITLAB_TOKEN="${GITLAB_TOKEN:-${CI_JOB_TOKEN}}"

# Export fail on critical setting
export REVIEW_FAIL_ON_CRITICAL="$FAIL_ON_CRITICAL"

# Run the review
cd "$PROJECT_DIR"
node dist/cli.js --mode "$MODE"

EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
  echo "Review completed with issues (exit code: $EXIT_CODE)"
  if [ "$FAIL_ON_CRITICAL" = "true" ]; then
    exit $EXIT_CODE
  fi
fi

echo "Review completed successfully."
