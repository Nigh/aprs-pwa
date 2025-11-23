// astro.config.mjs
import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import tailwindcss from '@tailwindcss/vite';
import AstroPWA from '@vite-pwa/astro';
import icon from "astro-icon";

const BASE_PATH = process.env.PUBLIC_BASE_URL || '/';
const SITE_URL = process.env.PUBLIC_SITE_URL || 'http://localhost:4321';

export default defineConfig({
  base: BASE_PATH,
  site: SITE_URL,
  integrations: [
    icon(),
    svelte(),
    AstroPWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'APRS-TX Transmitter',
        short_name: 'APRS-TX',
        description: 'Automatic Packet Reporting System Transmitter for Amateur Radio',
        theme_color: '#3b82f6',
        background_color: '#ffffff',
        display: 'standalone',
        categories: ['amateur-radio', 'communication'],
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{css,js,html,svg,png,ico,txt}'],
      },
      devOptions: {
        enabled: true,
        navigateFallbackAllowlist: [/^\/$/],
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
