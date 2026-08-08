#!/bin/bash
# Export all secrets from KDE Wallet to a file
# Usage: ./export-kwallet.sh [output-file]
#   Default output: kwallet-export-<date>.env

WALLET="kdewallet"
FOLDER="arcade-site"
FILE="${1:-kwallet-export-$(date +%Y-%m-%d).env}"

echo "Exporting all secrets from kwallet..."

keys=$(kwallet-query "$WALLET" -l -f "$FOLDER" 2>/dev/null)

> "$FILE"

while IFS= read -r key; do
  [ -z "$key" ] && continue
  value=$(kwallet-query "$WALLET" -f "$FOLDER" -r "$key" 2>/dev/null)
  if [ -n "$value" ] && [ "$value" != "(no match)" ]; then
    echo "$key=$value" >> "$FILE"
  fi
done <<< "$keys"

count=$(wc -l < "$FILE")
echo "Done. Exported $count keys to $FILE"
