#!/usr/bin/env bash
# Test Resend API direkt (curl). Zeigt HTTP-Status und komplette Antwort von Resend.
#
# Nutzung:
#   cd apps/crm && ./scripts/test-resend-email.sh [EMPFAENGER_EMAIL]
#   oder: RESEND_API_KEY=re_xxx ./scripts/test-resend-email.sh deine@email.com
#
# Key wird aus .env.local gelesen, falls RESEND_API_KEY nicht gesetzt ist.

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CRM_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$CRM_ROOT/.env.local"

if [ -f "$ENV_FILE" ]; then
  echo "Lade Variablen aus $ENV_FILE"
  set -a
  # shellcheck source=/dev/null
  source "$ENV_FILE"
  set +a
fi

if [ -z "$RESEND_API_KEY" ]; then
  echo "Fehler: RESEND_API_KEY nicht gesetzt. In .env.local eintragen oder export RESEND_API_KEY=re_..."
  exit 1
fi

# From: verifizierte Domain nutzen (EMAIL_FROM in .env.local), sonst Sandbox
FROM_EMAIL="${EMAIL_FROM:-onboarding@resend.dev}"
FROM_NAME="${EMAIL_FROM_NAME:-Designstudio BaLeah}"

TO="${1:-}"
if [ -z "$TO" ]; then
  echo "Hinweis: Kein Empfänger angegeben. Aufruf: $0 EMPFAENGER_EMAIL"
  exit 1
fi

echo "From: $FROM_NAME <$FROM_EMAIL>"
echo "Sende Test-Mail an: $TO"
echo "---"

RESPONSE=$(mktemp)
HTTP=$(curl -s -w "%{http_code}" -o "$RESPONSE" \
  -X POST "https://api.resend.com/emails" \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"from\": \"$FROM_NAME <$FROM_EMAIL>\",
    \"to\": [\"$TO\"],
    \"subject\": \"Test Bestellung (Resend-Check)\",
    \"html\": \"<p>Test-Mail von kitchen-online Resend-Check.</p>\",
    \"text\": \"Test-Mail von kitchen-online Resend-Check.\"
  }")

echo "HTTP-Status: $HTTP"
echo "Response-Body:"
cat "$RESPONSE" | jq . 2>/dev/null || cat "$RESPONSE"
rm -f "$RESPONSE"

if [ "$HTTP" -ge 200 ] && [ "$HTTP" -lt 300 ]; then
  echo "---"
  echo "OK: E-Mail wurde von Resend angenommen."
else
  echo "---"
  echo "Fehler: Resend hat den Versand abgelehnt (Status $HTTP). Siehe Response oben für Details."
  exit 1
fi
