# Travel Agency Management System

Vite + React app with an isolated VPS stack (Caddy + Docker Postgres + platform API).

## Run locally

```bash
cp .env.example .env   # VITE_USE_PLATFORM_API=1 → live production API/data
npm install
npm run dev
```

Open http://localhost:8003.

Local Vite proxies `/api` to `https://api.onetrack.inventivelab.bd`, so localhost uses the **same live API + database** as production (not seed/demo data). Restart `npm run dev` after changing `.env`.

## Production

| Piece | Where |
|-------|--------|
| App UI | **VPS** (Caddy static) → https://onetrack.inventivelab.bd |
| API + Postgres | **VPS** (isolated Docker) → https://api.onetrack.inventivelab.bd |

DNS for both hostnames must point at the inventivelab VPS (same host as `api.onetrack`).

Build-time env (set by `npm run deploy:vps`):

- `VITE_USE_PLATFORM_API=1`
- `VITE_API_BASE_URL=https://api.onetrack.inventivelab.bd`

Deploy UI + API/DB:

```bash
# needs VPS_HOST / VPS_USER / VPS_PASSWORD in local .env
npm run deploy:vps
```

VPS paths (do not share networks/volumes with n8n or MinIO): `/opt/onetrack-platform` (UI in `web/`), Postgres on `127.0.0.1:5433`, API on `127.0.0.1:4010`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Local Vite (:8003) |
| `npm run build` | Production build |
| `npm run deploy:vps` | Build UI + ship isolated stack to VPS |
| `npm run deploy:ec2` | Legacy shared-EC2 `/platform` deploy |
| `npm test` | Vitest |
| `npm run lint` | ESLint |
