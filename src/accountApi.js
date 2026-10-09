export async function request(path, body) {
  let response;
  try { response = await fetch(`/api/${path}`, { credentials: 'same-origin', ...(body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}) }); }
  catch { throw new Error('Unable to connect. Please try again.'); }
  let data;
  try { data = await response.json(); } catch { throw new Error('The account service is unavailable. Please try again later.'); }
  if (!response.ok) { const error = new Error(data.error || 'Please try again.'); error.status = response.status; error.retryAfter = Number(response.headers.get('retry-after')) || 0; throw error; }
  return data;
}
