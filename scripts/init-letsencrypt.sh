#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# One-time bootstrap to get the FIRST Let's Encrypt certificate.
#
# The catch-22: nginx will not start its :443 server without a cert file, but
# certbot needs nginx answering on :80 to prove you control the domain. So we:
#   1. drop in a throwaway self-signed cert so nginx can boot,
#   2. start nginx,
#   3. delete the throwaway and ask Let's Encrypt for the real cert,
#   4. reload nginx.
# After this runs once, the long-running certbot container handles renewals.
#
# Run ONCE on the server, from the project root (the folder with docker-compose.yml):
#   DOMAIN=54.255.149.137.sslip.io EMAIL=you@example.com ./scripts/init-letsencrypt.sh
# ---------------------------------------------------------------------------
set -euo pipefail

DOMAIN="${DOMAIN:?Set DOMAIN, e.g. DOMAIN=54.255.149.137.sslip.io}"
EMAIL="${EMAIL:?Set EMAIL, e.g. EMAIL=you@example.com}"
CERT_NAME="app"
CERT_PATH="/etc/letsencrypt/live/$CERT_NAME"

echo "### 1/4 Creating a temporary self-signed cert so nginx can start ..."
docker compose run --rm --entrypoint sh certbot -c \
  "mkdir -p $CERT_PATH && openssl req -x509 -nodes -newkey rsa:2048 -days 1 -keyout $CERT_PATH/privkey.pem -out $CERT_PATH/fullchain.pem -subj /CN=localhost"

echo "### 2/4 Starting nginx (and the backend it proxies to) ..."
docker compose up -d nginx

echo "### 3/4 Removing the temporary cert and requesting the real one ..."
docker compose run --rm --entrypoint sh certbot -c \
  "rm -rf /etc/letsencrypt/live/$CERT_NAME /etc/letsencrypt/archive/$CERT_NAME /etc/letsencrypt/renewal/$CERT_NAME.conf"

docker compose run --rm --entrypoint certbot certbot \
  certonly --webroot -w /var/www/certbot --cert-name "$CERT_NAME" \
  -d "$DOMAIN" --email "$EMAIL" --agree-tos --no-eff-email --non-interactive

echo "### 4/4 Reloading nginx with the real certificate ..."
docker compose exec nginx nginx -s reload

echo "### Done -> https://$DOMAIN should now be live."
