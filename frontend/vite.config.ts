import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'

/**
 * The commit this bundle was built from.
 *
 * Stamped into the HTML so "is what I pushed actually live" is answerable from
 * outside — the single most expensive unknown when a deploy pipeline goes
 * quiet. Vercel supplies the SHA as an env var; fall back to git locally.
 */
function buildSha(): string {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7)
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim()
  } catch {
    return 'unknown'
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'stamp-build-sha',
      transformIndexHtml(html) {
        return html.replace(
          '</head>',
          `  <meta name="build-sha" content="${buildSha()}" />\n  </head>`,
        )
      },
    },
  ],
  server: {
    port: 3000,
    host: true,
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    rollupOptions: {
      output: {
        // React and Framer Motion change far less often than the game, so a
        // deploy that only touches game code leaves these cached on the phone.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react'
          if (id.includes('node_modules/framer-motion') || id.includes('node_modules/motion-')) return 'motion'
          return undefined
        },
      },
    },
  },
  define: {
    'process.env': {},
    global: 'globalThis',
  },
})

