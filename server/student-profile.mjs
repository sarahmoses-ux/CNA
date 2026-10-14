export function studentProfile(body) {
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  const enrollment_date = body.enrollment_date;
  if (!/^[+()\d.\s-]{7,40}$/.test(phone) || phone.replace(/\D/g, '').length < 7) throw Object.assign(new Error('Enter a valid phone number.'), { status: 400 });
  if (typeof enrollment_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(enrollment_date) || !Number.isFinite(Date.parse(enrollment_date)) || new Date(enrollment_date).toISOString().slice(0, 10) !== enrollment_date) throw Object.assign(new Error('Enter a valid enrollment date.'), { status: 400 });
  return { phone, enrollment_date };
}
