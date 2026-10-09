export function createOtpMailer({ apiKey = process.env.RESEND_API_KEY, from = process.env.RESEND_FROM, fetchEmail = fetch } = {}) {
  const configured = Boolean(apiKey && from);
  const send = async ({ email, code, purpose, deliveryId }) => {
    if (!configured) throw Object.assign(new Error('Email verification is not configured yet. Please contact admissions.'), { status: 503 });
    try {
      const response = await fetchEmail('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': deliveryId },
        body: JSON.stringify({
          from, to: [email], subject: 'Your CNA Training Academy verification code',
          text: `Your ${purpose === 'register' ? 'account registration' : 'sign-in'} code is ${code}.\n\nIt expires in 10 minutes. Do not share this code. If you did not request it, you can ignore this email.\n\nCNA Training Academy`,
          html: `<h1>Verify your email</h1><p>Your ${purpose === 'register' ? 'account registration' : 'sign-in'} code is:</p><p style="font-size:32px;font-weight:bold;letter-spacing:6px">${code}</p><p>This code expires in 10 minutes. Do not share it.</p><p>If you did not request this code, you can ignore this email.</p><p>CNA Training Academy</p>`,
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok || !(await response.json()).id) throw new Error('Email delivery rejected');
    } catch {
      throw Object.assign(new Error('We could not send your verification code. Please try again later.'), { status: 503 });
    }
  };
  send.configured = configured;
  return send;
}
