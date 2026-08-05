#!/bin/bash
# Store CRYSTAL // FORGE secrets into KDE Wallet
# Usage: ./store-env.sh

WALLET="kdewallet"
FOLDER="arcade-site"

store_key() {
  local key="$1"
  local prompt="$2"
  read -rsp "$prompt: " value
  echo
  if [ -n "$value" ]; then
    echo "$value" | kwallet-query "$WALLET" -f "$FOLDER" -w "$key" 2>/dev/null
    echo "  stored $key"
  fi
}

echo "Storing CRYSTAL // FORGE secrets into kwallet..."
store_key GEMINI_API_KEY "Gemini API Key"
store_key PEXELS_API_KEY "Pexels API Key"
store_key NEXT_PUBLIC_SITE_URL "Site URL (https://arcade-site-gamma.vercel.app)"
store_key NEXT_PUBLIC_SUPABASE_URL "Supabase URL"
store_key NEXT_PUBLIC_SUPABASE_ANON_KEY "Supabase Anon Key"
store_key SUPABASE_SERVICE_ROLE_KEY "Supabase Service Role Key"
store_key RESEND_API_KEY "Resend API Key"
store_key STRIPE_SECRET_KEY "Stripe Secret Key"
store_key STRIPE_WEBHOOK_SECRET "Stripe Webhook Secret"
store_key CRON_SECRET "Cron Secret"
store_key DISCORD_WEBHOOK_URL "Discord Webhook URL"
echo "Done. Run 'source load-env.sh' to load them."
