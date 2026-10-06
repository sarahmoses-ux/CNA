import { createAccountServer } from './accounts.mjs';
import { loadApiEnvironment } from './environment.mjs';
loadApiEnvironment();
if (!process.env.MONGODB_URI) throw new Error('Set MONGODB_URI in .env before starting the account API.');
const port = Number(process.env.API_PORT || 3001);
const server = createAccountServer();
server.listen(port, '127.0.0.1', () => console.log(`Account API listening on http://127.0.0.1:${port}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => server.close(async () => { await server.closeDatabase(); process.exit(0); }));
