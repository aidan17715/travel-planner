import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Served from https://<user>.github.io/travel-planner/
const base = '/travel-planner/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // The privacy and terms pages are plain HTML, so the service worker must not replace them with the app shell
      workbox: { navigateFallbackDenylist: [/(privacy|terms)\.html$/] },
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Travel Planner',
        short_name: 'Trips',
        description: 'Plan trips, itineraries, flights and budgets. Works offline.',
        theme_color: '#0e7490',
        background_color: '#f1f5f9',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
