# Travel Agency Management System

Vite + React shell. Independently deployable to EC2, mounted at `/platform`.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:8003.

```bash
cp .env.example .env   # optional; VITE_API_BASE_URL empty = same-origin /api
```

## Deploy to EC2 `/platform` (from this repo)

One-time:

```bash
cp .env.deploy.example .env.deploy
# edit PERF_EC2_HOST + PERF_EC2_PEM if needed
```

Every release:

```bash
npm run deploy:ec2
```

That builds with `base: /platform/`, uploads to `/var/www/platform`, reloads nginx if needed.

**Not required for deploy:** `DB_*`, RDS, encryption keys. Those stay with the API until this platform has its own backend.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Local Vite (:8003) |
| `npm run build` | Production build (`/platform/` base) |
| `npm run deploy:ec2` | Build + ship to EC2 `/platform` |
| `npm test` | Vitest |
| `npm run lint` | ESLint |
