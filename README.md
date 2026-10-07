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

## Production (inventivelab VPS)

Isolated paths (does not share networks/volumes with n8n, MinIO, or Cloudreve):

| Piece | Location |
|-------|----------|
| SPA | `/var/www/onetrack-platform` |
| API + compose | `/opt/onetrack-platform` |
| Postgres | Docker `onetrack-platform-db` on `127.0.0.1:5433` only |
| Public site | `https://tams.inventivelab.bd` |

Requires `VPS_HOST`, `VPS_USER`, `VPS_PASSWORD` in local `.env` (gitignored).

```bash
npm run deploy:vps
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Local Vite (:8003) |
| `npm run build` | Production build |
| `npm run deploy:vps` | Build + ship isolated stack to VPS |
| `npm run deploy:ec2` | Legacy shared-EC2 `/platform` deploy |
| `npm test` | Vitest |
| `npm run lint` | ESLint |
