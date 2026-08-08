#!/bin/bash
# Store secrets into KDE Wallet
# Usage: ./store-env.sh
#   Interactive — type key name, then paste value. Empty key name to quit.

WALLET="kdewallet"
FOLDER="arcade-site"

echo "Storing secrets into kwallet..."
echo "(Type key name, paste value, empty key to quit)"
echo

while true; do
  read -rp "Key name: " key
  [ -z "$key" ] && break
  read -rsp "Value: " value
  echo
  if [ -n "$value" ]; then
    echo "$value" | kwallet-query "$WALLET" -f "$FOLDER" -w "$key" 2>/dev/null
    echo "  stored $key"
  fi
done

echo "Done. Run 'source load-env.sh' to load them."
