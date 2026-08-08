#!/bin/bash
# Load all secrets from KDE Wallet into environment
# Usage: source load-env.sh

WALLET="kdewallet"
FOLDER="arcade-site"

echo "Loading secrets from kwallet..."

keys=$(kwallet-query "$WALLET" -l -f "$FOLDER" 2>/dev/null)

while IFS= read -r key; do
  [ -z "$key" ] && continue
  value=$(kwallet-query "$WALLET" -f "$FOLDER" -r "$key" 2>/dev/null)
  if [ -n "$value" ] && [ "$value" != "(no match)" ]; then
    export "$key=$value"
    echo "  loaded $key"
  fi
done <<< "$keys"

echo "Done."
