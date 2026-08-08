#!/bin/bash
# Pull all environment variables from Vercel into .env.local
# Usage: ./pull-env.sh [environment]
#   environment: production (default), preview, or development

ENV="${1:-production}"
FILE=".env.local"

echo "Pulling env vars from Vercel ($ENV)..."

vercel env pull "$FILE" --environment "$ENV" --yes

if [ -f "$FILE" ]; then
  echo "Done. Wrote $FILE"
else
  echo "Failed to pull env vars."
fi
