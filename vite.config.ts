import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import https from 'node:https'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import { getThemeBootstrapScript } from './src/lib/brand'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const pkg = require('./package.json') as { version: string }

function platformApiProxy(env: Record<string, string>) {
  /** Live API hostname (Caddy vhost + TLS SNI). */
  const apiHost =
    env.VITE_DEV_API_HOST?.trim() || 'api.onetrack.inventivelab.bd'
  /**
   * Dev `/api` proxy target. When DNS for the API host fails, set
   * `VITE_DEV_API_PROXY=https://<vps-ip>` and keep Host/SNI as apiHost.
   */
  const apiProxy =
    env.VITE_DEV_API_PROXY?.trim() || `https://${apiHost}`
  const usesIp =
    /^https?:\/\/(?:\d{1,3}\.){3}\d{1,3}(?::\d+)?\/?$/i.test(apiProxy)

  return {
    '/api': {
      target: apiProxy,
      changeOrigin: true,
      secure: false,
      ...(usesIp
        ? {
            headers: { Host: apiHost },
            agent: new https.Agent({
              rejectUnauthorized: false,
              servername: apiHost,
            }),
            configure(proxy: {
              on: (
                event: string,
                listener: (...args: unknown[]) => void,
              ) => void
            }) {
              proxy.on('proxyReq', (...args: unknown[]) => {
                const proxyReq = args[0] as {
                  setHeader: (name: string, value: string) => void
                }
                proxyReq.setHeader('Host', apiHost)
              })
            },
          }
        : {}),
    },
  }
}

export default defineConfig(({ mode }) => {
  // Vite does not put .env into process.env for config — load explicitly.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    // Default `/` for VPS and local builds.
    // Legacy EC2 deploy sets VITE_BASE_PATH=/platform/ (see scripts/deploy-to-ec2.sh).
    base: env.VITE_BASE_PATH || process.env.VITE_BASE_PATH || '/',
    plugins: [
      react(),
      {
        name: 'inject-theme-bootstrap',
        transformIndexHtml(html) {
          return html.replace(
            '<!--app-theme-bootstrap-->',
            `<script>${getThemeBootstrapScript()}</script>`,
          )
        },
      },
    ],
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return
            if (id.includes('@tanstack/react-query')) return 'query'
            if (id.includes('@tanstack/react-virtual')) return 'virtual'
            if (id.includes('react-router')) return 'router'
            if (id.includes('lucide-react')) return 'icons'
            if (
              id.includes('node_modules/react-dom') ||
              id.includes('node_modules/react/')
            ) {
              return 'react-vendor'
            }
          },
        },
      },
    },
    server: {
      host: true,
      port: 8003,
      strictPort: true,
      // Allow ngrok / localtunnel public hostnames during local preview
      allowedHosts: true,
      // Same-origin /api → live platform API (avoids CORS; live data in local UI).
      // secure:false — local networks sometimes present an intercepting/self-signed chain.
      proxy: platformApiProxy(env),
    },
    preview: {
      host: true,
      port: 8003,
      strictPort: true,
      proxy: platformApiProxy(env),
    },
  }
})
