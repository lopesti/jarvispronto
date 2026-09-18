# Nginx HTTPS — JARVIS Comercial

## Desenvolvimento (localhost)

Certificado **autoassinado** em `nginx/certs/`:

```bash
# Linux/macOS
chmod +x scripts/generate-ssl.sh
./scripts/generate-ssl.sh

# Windows (Git Bash ou WSL) — ou use openssl:
openssl req -x509 -nodes -newkey rsa:2048 -days 365 -keyout nginx/certs/privkey.pem -out nginx/certs/fullchain.pem -subj "/CN=localhost"
```

Subir:

```bash
docker compose up -d --build
```

Acesse: **https://localhost/**  
O navegador avisará "não seguro" (normal em autoassinado) → Avançado → Continuar.

HTTP (`http://localhost/`) redireciona para HTTPS.

## Produção (Let's Encrypt)

1. Domínio apontando para o servidor (A record).
2. Portas 80 e 443 abertas.
3. Ajuste `server_name` em `nginx/conf.d/jarvis.conf` para o domínio.
4. Monte certificados Let's Encrypt no Nginx (troque paths `ssl_certificate`).
5. Emita:

```bash
DOMAIN=meudominio.com EMAIL=seu@email.com ./scripts/certbot-init.sh
```

## Voltar só HTTP

1. Use o conteúdo de `jarvis-http-only.conf.disabled` como `jarvis.conf`.
2. Remova a porta `443:443` do compose se quiser.

## Segurança

- TLS 1.2 / 1.3
- HSTS
- Headers X-Frame-Options, nosniff, Referrer-Policy
- Rate limit em `/auth/`
