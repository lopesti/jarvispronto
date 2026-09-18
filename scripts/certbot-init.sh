#!/bin/sh
# Producao: emite certificado Let's Encrypt (dominio real + portas 80/443 abertas)
# Uso: DOMAIN=meusite.com EMAIL=seu@email.com ./scripts/certbot-init.sh
set -e
DOMAIN="${DOMAIN:?Defina DOMAIN=seu.dominio.com}"
EMAIL="${EMAIL:?Defina EMAIL=seu@email.com}"

docker compose run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d "$DOMAIN" \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email

echo "Certificados em volume certbot_etc"
echo "Ajuste server_name em nginx/conf.d/jarvis.conf para $DOMAIN"
echo "Aponte ssl_certificate para /etc/letsencrypt/live/$DOMAIN/fullchain.pem"
