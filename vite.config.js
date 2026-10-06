import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { createAccountServer } from './server/accounts.mjs'
function accounts() {
  return {
    name: 'academy-accounts',
    configureServer(vite) {
      const environment = loadEnv(vite.config.mode, process.cwd(), '');
      for (const key of ['MONGODB_URI', 'MONGODB_DB', 'APP_ORIGIN']) {
        if (process.env[key] === undefined && environment[key]) process.env[key] = environment[key];
      }
      const api = createAccountServer();
      vite.middlewares.use((req, res, next) => req.url?.startsWith('/api/') ? api.emit('request', req, res) : next());
      vite.httpServer?.on('close', () => api.emit('close'));
    },
  };
}
export default defineConfig({ plugins: [react(), accounts()] })

