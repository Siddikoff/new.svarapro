# Deploying svarapro

This guide covers running the full stack (NestJS server + React/Vite client +
Telegram bots + Postgres + Redis + nginx) on a fresh Ubuntu 24.04 VPS, served
over HTTPS on `svarapro.com`.

## 1. Prerequisites

- A VPS with a public IPv4 (≥ 2 vCPU, 4 GB RAM, 20 GB disk). Hetzner CX22 is
  fine.
- Docker Engine ≥ 24 and the Docker Compose plugin (`docker compose` v2).
- `certbot` from apt (used only for issuing/renewing the Let's Encrypt cert —
  nginx itself runs inside the `nginx` compose service).
- DNS `A` record `svarapro.com` → VPS public IP.
- A Telegram main bot token + service bot token + your Telegram numeric
  `user_id`.

## 2. Clone

```bash
sudo mkdir -p /root/svarapro
cd /root && git clone https://github.com/msiddikoff001-glitch/svarapro.git
cd /root/svarapro
```

## 3. Configure secrets

Two `.env` files are needed:

### `/root/svarapro/.env` (consumed by `docker-compose.yml`)

```bash
cp .env.example .env
$EDITOR .env
```

Fill in `BOT_TOKEN`, `SERVICE_BOT_TOKEN`, `ADMIN_IDS`, `POSTGRES_PASSWORD`,
`API_SECRET`, and the optional `NIRVANAPAY_*` keys.

### `/root/svarapro/server/.env` (read by the NestJS container)

This file is loaded via `env_file:` in `docker-compose.yml`. Most values are
overridden by the `environment:` block in the same compose file — the only
keys you actually need to put here are the ones compose does NOT set
explicitly:

```env
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_USER=svarapro
POSTGRES_PASSWORD=<same as root .env>
POSTGRES_DB=svarapro
JWT_SECRET=<long random string>
ALLOWED_ORIGINS=https://svarapro.com
NOROS_BASE_URL=https://rest.noros.org/api/v1
```

Generate strong secrets with:

```bash
openssl rand -hex 32   # for POSTGRES_PASSWORD / JWT_SECRET / API_SECRET
```

## 4. Issue the TLS certificate (first run only)

The `nginx` service expects a real cert at
`/etc/letsencrypt/live/svarapro.com/`. Use certbot's `--standalone` mode
**before** starting docker compose (port 80 must be free), or `--webroot`
after the stack is up.

### First-run (standalone, port 80 free)

```bash
apt-get install -y certbot
certbot certonly --standalone \
  -d svarapro.com \
  --non-interactive --agree-tos -m admin@svarapro.com
```

### Renewal (webroot, while nginx is up)

`docker-compose.yml` mounts `/var/www/certbot` into the nginx container and
`nginx/default.conf` serves `/.well-known/acme-challenge/` from it. So
renewals work without downtime:

```bash
mkdir -p /var/www/certbot
certbot renew --webroot -w /var/www/certbot --deploy-hook \
  "docker compose -f /root/svarapro/docker-compose.yml exec nginx nginx -s reload"
```

A daily cron is installed by the certbot package — no extra setup needed.

## 5. Build and start

```bash
cd /root/svarapro
./build.sh                  # docker compose build --parallel
docker compose up -d
docker compose ps
docker compose logs -f app  # watch the NestJS server come up
```

The app comes up healthy when `GET https://svarapro.com/api/v1/health`
returns `200`.

## 6. Telegram wiring

After the stack is healthy, point the main bot's Menu Button + WebApp URL at
the live domain:

```bash
BOT_TOKEN=<your bot token>
curl -s "https://api.telegram.org/bot${BOT_TOKEN}/setChatMenuButton" \
  -H 'Content-Type: application/json' \
  -d '{"menu_button":{"type":"web_app","text":"Play","web_app":{"url":"https://svarapro.com"}}}'
```

If your bot uses webhooks (not long polling), also set:

```bash
curl -s "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=https://svarapro.com/api/v1/telegram/webhook"
```

## 7. Smoke test

```bash
curl -sSI https://svarapro.com/                       # 200 + HSTS
curl -sS  https://svarapro.com/api/v1/health | jq .   # ok
```

In Telegram, open the bot and tap the Menu Button — the Mini App should load
the lobby.

## 8. Operational notes

- Logs: `docker compose logs <service>` (or `pm2 logs` inside the `app`
  container).
- DB shell: `docker compose exec postgres psql -U svarapro -d svarapro`.
- Redis CLI: `docker compose exec redis redis-cli`.
- TypeORM uses `synchronize: true` in production (see `server/src/app.module.ts`)
  so schema changes are auto-applied on container restart. Plan migrations
  carefully.
- The firewall should allow 22/tcp, 80/tcp and 443/tcp only:
  `ufw allow 22 && ufw allow 80 && ufw allow 443 && ufw enable`.
