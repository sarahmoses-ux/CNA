import { proxyAccountRequest } from '../server/proxy.mjs';

// Account processing and database connections live on Render.
export default async function accounts(req, res) {
  await proxyAccountRequest(req, res);
}
