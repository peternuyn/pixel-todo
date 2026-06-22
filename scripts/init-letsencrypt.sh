#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# One-time bootstrap to get the FIRST Let's Encrypt certificate.
#
# The catch-22: nginx won't start its :443 server without a cert file, but
# certbot needs nginx answering on :80 to prove you control the domain. So we:
#   1. drop in a throwaway self-signed cert so nginx can boot,
#   2. start nginx,
#   3. delete the throwaway and ask Let's Encrypt for the real cert,
#   4. reload nginx.
# After this runs once, the long-running certbot container handles renewals.
#
# Run ONCE on the EC2 box, from the project root:
#   DOMAIN=54.255.149.137.sslip.io EMAIL=you@example.com ./scripts/init-letsencrypt.sh
# ---------------------------------------------------------------------------
set -euo pipefail

DOMAIN="${DOMAIN:?Set DOMAIN, e.g. DOMAIN=54.255.149.137.sslip.io}"
EMAIL="${EMAIL:?Set EMAIL for Let's Encrypt expiry notices}"
CERT_NAME="app"
CERT_PATH="/etc/letsencrypt/live/$CERT_NAME"

# Use "docker compose" (v2). Fall back to "docker-compose" if that's what's installed.
dc() { docker compose "$@" 2>/dev/null || docker-compose "$@"; }

echo "### 1/4 Creating a temporary self-signed cert so nginx can start ..."
dc run --rm --entrypoint "\
  sh -c 'mkdir -p $CERT_PATH && \
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout $CERT_PATH/privkey.pem \
    -out    $CERT_PATH/fullchain.pem \
    -subj /CN=localhost'" certbot

echo "### 2/4 Starting nginx (and the backend it proxies to) ..."
dc up -d nginx

echo "### 3/4 Removing the temporary cert and requesting the real one ..."
dc run --rm --entrypoint "\
  rm -rf /etc/letsencrypt/live/$CERT_NAME \
         /etc/letsencrypt/archive/$CERT_NAME \
         /etc/letsencrypt/renewal/$CERT_NAME.conf" certbot

dc run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    --cert-name $CERT_NAME \
    -d $DOMAIN \
    --email $EMAIL \
    --agree-tos --no-eff-email --non-interactive" certbot

echo "### 4/4 Reloading nginx with the real certificate ..."
dc exec nginx nginx -s reload

echo "### Done -> https://$DOMAIN should now be live."
