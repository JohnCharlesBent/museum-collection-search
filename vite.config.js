import process from 'node:process'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite"

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // HARVARD_API_KEY comes from .env.local (not committed). It's only used
  // here, by the dev server, so it never reaches the browser.
  const env = loadEnv(mode, process.cwd(), '')
  const harvardKey = env.HARVARD_API_KEY

  return {
    plugins: [react(), tailwindcss()],
    define: {
      // Tells the app whether to offer Harvard (true when a key is set).
      'import.meta.env.VITE_HARVARD_ENABLED': JSON.stringify(harvardKey ? 'true' : 'false'),
    },
    server: {
      // In development, API requests go through the Vite server so the browser
      // never makes a cross-site request (which AIC's bot protection blocks).
      proxy: {
        '/aic': {
          target: 'https://api.artic.edu',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/aic/, ''),
          headers: { 'AIC-User-Agent': 'aic_search (personal project)' },
        },
        // Artwork images (IIIF) are served from www.artic.edu.
        '/iiif': {
          target: 'https://www.artic.edu',
          changeOrigin: true,
          headers: { 'AIC-User-Agent': 'aic_search (personal project)' },
        },
        '/met': {
          target: 'https://collectionapi.metmuseum.org',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/met/, ''),
        },
        // Harvard: the dev server adds the API key to every request.
        '/harvard': {
          target: 'https://api.harvardartmuseums.org',
          changeOrigin: true,
          rewrite: (path) => {
            const rest = path.replace(/^\/harvard/, '')
            return `${rest}${rest.includes('?') ? '&' : '?'}apikey=${encodeURIComponent(harvardKey ?? '')}`
          },
        },
      },
    },
  }
})
