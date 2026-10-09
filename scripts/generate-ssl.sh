#!/bin/sh
# Gera certificado autoassinado para desenvolvimento local (localhost)
set -e
DIR="$(cd "$(dirname "$0")/.." && pwd)/nginx/certs"
mkdir -p "$DIR"
cd "$DIR"

if [ -f fullchain.pem ] && [ -f privkey.pem ]; then
  echo "Certificados ja existem em nginx/certs/"
  echo "Apague fullchain.pem e privkey.pem para regenerar."
  exit 0
fi

openssl req -x509 -nodes -newkey rsa:2048 -days 365 \
  -keyout privkey.pem \
  -out fullchain.pem \
  -subj "/CN=localhost/O=JARVIS Comercial/C=BR" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

chmod 600 privkey.pem
chmod 644 fullchain.pem
echo "OK: nginx/certs/fullchain.pem e privkey.pem criados (autoassinado, 365 dias)."
echo "No navegador: aceite o aviso de certificado autoassinado em https://localhost/"
