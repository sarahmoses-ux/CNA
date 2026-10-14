export const isStaff = role => role === 'admin' || role === 'superadmin';
export const superadminEmail = 'sayflux04@gmail.com';
export async function staffDirectory(collection, configured) {
  const assignments = await collection.find({}).toArray();
  const emails = new Set([...configured, superadminEmail]);
  for (const item of assignments) {
    if (item.enabled) emails.add(item._id);
    else if (item._id !== superadminEmail) emails.delete(item._id);
  }
  return [...emails].sort();
}
export function handleStaffAccess({ user, body, req, staffAccess, staffEmails, now, reply }) {
  if (user?.role !== 'superadmin') return reply(403, { error: 'Superadministrator access is required.' });
  if (req.method === 'GET') return reply(200, { admins: staffEmails.map(email => ({ email, role: email === superadminEmail ? 'superadmin' : 'admin' })) });
  return (async () => {
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !['add', 'remove'].includes(body.action)) return reply(400, { error: 'Enter a valid email and staff action.' });
    if (email === superadminEmail) return reply(400, { error: 'The superadministrator cannot be removed or reassigned.' });
    await staffAccess.updateOne({ _id: email }, { $set: { enabled: body.action === 'add', updated_by: user.email, updated_at: new Date(now()).toISOString() } }, { upsert: true });
    return reply(200, { ok: true });
  })();
}
