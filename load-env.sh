#!/bin/bash
# Load NEON//FORGE secrets from KDE Wallet into environment
# Usage: source load-env.sh

WALLET="kdewallet"
FOLDER="neon-forge"

load_key() {
  local key="$1"
  local value
  value=$(kwallet-query "$WALLET" -f "$FOLDER" "$key" 2>/dev/null)
  if [ -n "$value" ] && [ "$value" != "(no match)" ]; then
    export "$key=$value"
    echo "  loaded $key"
  fi
}

echo "Loading NEON//FORGE secrets from kwallet..."
load_key GEMINI_API_KEY
load_key PEXELS_API_KEY
load_key NEXT_PUBLIC_SITE_URL
load_key NEXT_PUBLIC_SUPABASE_URL
load_key NEXT_PUBLIC_SUPABASE_ANON_KEY
load_key SUPABASE_SERVICE_ROLE_KEY
load_key RESEND_API_KEY
load_key STRIPE_SECRET_KEY
load_key STRIPE_WEBHOOK_SECRET
load_key CRON_SECRET
load_key DISCORD_WEBHOOK_URL
echo "Done."
