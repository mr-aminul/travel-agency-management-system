# Travel Agency Management System

Vite + React app with an isolated VPS stack (Caddy + Docker Postgres + platform API).

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:8003.

```bash
cp .env.example .env   # optional; VITE_API_BASE_URL empty = same-origin /api
```

## Production

| Piece | Where |
|-------|--------|
| App UI | **Vercel** project `onetrack` → https://onetrack.inventivelab.bd |
| API + Postgres | **VPS** (isolated Docker) → https://api.onetrack.inventivelab.bd |

Vercel env (already set on the project):

- `VITE_USE_PLATFORM_API=1`
- `VITE_API_BASE_URL=https://api.onetrack.inventivelab.bd`

Pushing to `main` deploys the UI on Vercel. To refresh the API/DB stack on the VPS:

```bash
# needs VPS_HOST / VPS_USER / VPS_PASSWORD in local .env
npm run deploy:vps
```

VPS paths (do not share networks/volumes with n8n or MinIO): `/opt/onetrack-platform`, Postgres on `127.0.0.1:5433`, API on `127.0.0.1:4010`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Local Vite (:8003) |
| `npm run build` | Production build |
| `npm run deploy:vps` | Build + ship isolated stack to VPS |
| `npm run deploy:ec2` | Legacy shared-EC2 `/platform` deploy |
| `npm test` | Vitest |
| `npm run lint` | ESLint |
