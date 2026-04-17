import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

// Load mkcert certs if they exist (run `mkcert localhost 127.0.0.1 <your-ip>` in apps/web/certs/)
function loadCerts() {
  const certPath = path.resolve(__dirname, 'certs/localhost+2.pem');
  const keyPath = path.resolve(__dirname, 'certs/localhost+2-key.pem');
  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    return { cert: fs.readFileSync(certPath), key: fs.readFileSync(keyPath) };
  }
  return undefined;
}

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,   // expose to network so phone can connect via local IP
    https: loadCerts(),
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
