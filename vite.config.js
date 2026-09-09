import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    {
      name: 'development-csp',
      apply: 'serve',
      transformIndexHtml: {
        order: 'pre',
        handler: (html) =>
          html
            .replace("script-src 'self';", "script-src 'self' 'nonce-az104-dev';")
            .replace("connect-src 'none';", "connect-src 'self' ws://127.0.0.1:5173;"),
      },
    },
  ],
  html: command === 'serve' ? { cspNonce: 'az104-dev' } : undefined,
  base: './',
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
}));
