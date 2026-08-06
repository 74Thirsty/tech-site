#!/bin/bash
# Load CRYSTAL // FORGE secrets from KDE Wallet into environment
# Usage: source load-env.sh

WALLET="kdewallet"
FOLDER="arcade-site"

load_key() {
  local key="$1"
  local value
  value=$(kwallet-query "$WALLET" -f "$FOLDER" -r "$key" 2>/dev/null)
  if [ -n "$value" ] && [ "$value" != "(no match)" ]; then
    export "$key=$value"
    echo "  loaded $key"
  fi
}

echo "Loading CRYSTAL // FORGE secrets from kwallet..."
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
load_key PUTERJS_API_KEY
load_key GROQ_API_KEY
load_key OPENROUTER_API_KEY
load_key NEWS_API_KEY
load_key NEWSDATA_API_KEY
echo "Done."
