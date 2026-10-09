import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { request } from './accountApi';
import { Button, PageHeading } from './components';
import { academyContact, programs } from './data';
export function AccountForm({ register = false, admin = false, onAuthenticated }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [challenge, setChallenge] = useState(null);
  const [code, setCode] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    if (admin) return;
    let active = true;
    request('me').then(({ user }) => { if (active) navigate(user.role === 'admin' ? '/admin' : '/dashboard', { replace: true }); }).catch(() => {});
    return () => { active = false; };
  }, [navigate, register, admin]);
  useEffect(() => {
    if (!challenge) return;
    const update = () => setSeconds(Math.max(0, Math.ceil((challenge.resendAt - Date.now()) / 1000)));
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [challenge]);
  async function submit(event) {
    event.preventDefault(); if (busy) return; setBusy(true); setError(''); setNotice('');
    const form = event.currentTarget;
    try {
      if (challenge) {
        const { user } = await request('verify-otp', { challengeId: challenge.challengeId, code });
        if (admin) {
          if (user.role !== 'admin') { await request('logout', {}); startOver(); throw new Error('This account does not have administrator access.'); }
          onAuthenticated();
          return;
        }
        navigate(user.role === 'admin' ? '/admin' : '/dashboard', { replace: true });
      } else {
        const fields = Object.fromEntries(new FormData(form));
        const result = await request(register ? 'register' : 'login', fields);
        if (!result.verificationRequired || !result.challengeId) throw new Error('Unable to start email verification. Please try again.');
        form.reset();
        setChallenge({ ...result, email: fields.email.trim(), resendAt: Date.now() + result.resendAfter * 1000 });
        setSeconds(result.resendAfter);
        setNotice('A verification code has been sent. Check your inbox and spam folder.');
      }
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  async function resend() {
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await request('resend-otp', { challengeId: challenge.challengeId });
      setChallenge({ ...result, email: challenge.email, resendAt: Date.now() + result.resendAfter * 1000 });
      setSeconds(result.resendAfter);
      setCode(''); setNotice('A new code has been sent. Use the latest code from your email.');
    } catch (failure) {
      setError(failure.message);
      if (failure.retryAfter) { setSeconds(failure.retryAfter); setChallenge(previous => ({ ...previous, resendAt: Date.now() + failure.retryAfter * 1000 })); }
    } finally { setBusy(false); }
  }
  function startOver() { setChallenge(null); setCode(''); setError(''); setNotice(''); }
  return <>
    <PageHeading eyebrow={admin ? 'Staff administration' : 'Student account'} title={admin ? 'Administrator login.' : register ? 'Your journey starts here.' : 'Welcome back.'} description={register ? 'Create your academy account and verify your email to access your student dashboard.' : 'Sign in with your password, then confirm the code sent to your email.'} />
    <section className="section"><div className="container account-layout">
      <form className="account-form" onSubmit={submit} aria-busy={busy}>
        <h2>{challenge ? 'Verify your email' : admin ? 'Administrator sign in' : register ? 'Create an account' : 'Student sign in'}</h2>
        {challenge ? <>
          <p>Enter the six-digit code sent to <strong className="otp-email">{challenge.email}</strong>. The code expires in 10 minutes.</p>
          <label htmlFor="verification-code">Verification code</label>
          <input key="otp" id="verification-code" name="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} value={code} onChange={event => setCode(event.target.value.replace(/[^0-9]/g, '').slice(0, 6))} required autoFocus aria-describedby="otp-help" />
          <p id="otp-help" className="small-text">Use the latest code. Never share it with anyone.</p>
        </> : <>
          {register && <label>Full name<input name="name" autoComplete="name" required maxLength={100} disabled={busy} /></label>}
          <label>Email address<input name="email" type="email" autoComplete="email" required maxLength={254} disabled={busy} /></label>
          <label htmlFor="account-password">Password</label>
          <input key="password" id="account-password" name="password" type="password" autoComplete={register ? 'new-password' : 'current-password'} minLength={register ? 12 : 1} maxLength={128} required disabled={busy} aria-describedby={register ? 'password-help' : undefined} />
          {register && <p id="password-help" className="small-text">Use at least 12 characters.</p>}
          <p className="small-text">We will email you a verification code before you can access your account.</p>
        </>}
        {error && <p className="account-error" role="alert">{error}</p>}
        {notice && <p role="status">{notice}</p>}
        <button className="button button-primary" type="submit" disabled={busy}>{busy ? 'Please wait...' : challenge ? 'Verify and continue' : register ? 'Create account' : 'Sign in'}</button>
        {challenge ? <div className="otp-actions">
          <button className="button button-outline" type="button" disabled={busy || seconds > 0} onClick={resend}>{seconds > 0 ? `Resend code in ${seconds}s` : 'Resend code'}</button>
          <button className="text-link" type="button" disabled={busy} onClick={startOver}>Start again / change email</button>
        </div> : admin ? <p className="small-text">Access is restricted to authorized academy staff.</p> : <p>{register ? 'Already have an account?' : 'New to the academy?'} <Link className="text-link" to={register ? '/login' : '/register'}>{register ? 'Sign in' : 'Create an account'}</Link></p>}
      </form>
      {admin ? <aside className="admissions-aside"><p className="eyebrow">STAFF ACCESS</p><h2>Student administration.</h2><p>Sign in with your staff account to manage student contact details, enrollment, class schedules, and private notes.</p><p>Your email verification code is required each time you sign in.</p><Link className="text-link" to="/login">Student sign in</Link></aside> : <aside className="admissions-aside"><p className="eyebrow">IN-PERSON TRAINING</p><h2>Your account. Your next step.</h2><p>Your dashboard keeps your account details in one place. Classes take place at the academy, with practical instruction and hands-on learning.</p><p>Creating an account does not enroll you in a class. Contact admissions to confirm your program and schedule.</p><address>{academyContact.address}</address><div className="detail-block"><Button to="/programs" variant="outline">Explore programs</Button></div><p className="small-text">This account is separate from any existing FalconPad account.</p></aside>}
    </div></section>
  </>;
}
export function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [student, setStudent] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    Promise.all([request('me'), request('student-record')]).then(([account, record]) => { if (active) { setUser(account.user); setStudent(record.student); } }).catch(failure => { if (!active) return; if (failure.status === 401) navigate('/login', { replace: true }); else setError(failure.message); });
    return () => { active = false; };
  }, [navigate, retry]);
  async function logout() {
    setBusy(true); setError('');
    try { await request('logout', {}); navigate('/login', { replace: true }); } catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }
  if (!user) return <section className="section container"><h1>Student dashboard</h1>{error ? <><p role="alert">{error}</p><button className="button button-primary" onClick={() => { setError(''); setRetry(retry + 1); }}>Try again</button></> : <p role="status">Loading your account...</p>}</section>;
  return <><PageHeading eyebrow="Student dashboard" title={`Welcome, ${user.name}.`} description="Your personal connection to CNA Training Academy." /><section className="section"><div className="container"><div className="section-heading"><div><p className="eyebrow">MY ACCOUNT</p><h2>Your student dashboard</h2></div><button className="button button-outline" disabled={busy} onClick={logout}>{busy ? 'Signing out...' : 'Sign out'}</button></div>{error && <p role="alert" className="account-error">{error}</p>}<div className="dashboard-grid"><article className="dashboard-card"><p className="eyebrow">PROFILE</p><h3>Account details</h3><dl><dt>Full name</dt><dd>{user.name}</dd><dt>Email address</dt><dd>{user.email}</dd><dt>Account created</dt><dd>{new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(user.created_at))}</dd></dl></article><article className="dashboard-card"><p className="eyebrow">ENROLLMENT</p><h3>Your next step</h3><p>Enrollment status: <strong>{student?.status || 'Inquiry'}</strong></p><p>{programs.find(program => program.slug === student?.program)?.name || 'No program has been assigned yet. Speak with admissions to choose your training.'}</p><Button to="/admissions" variant="outline">Admission requirements</Button></article><article className="dashboard-card"><p className="eyebrow">IN-PERSON CLASSES</p><h3>Your class schedule</h3><p>{student?.class_schedule || 'No class schedule has been assigned yet.'}</p>{student?.start_date && <p>Starts: {student.start_date}</p>}{student?.end_date && <p>Ends: {student.end_date}</p>}<p>Admissions can help you confirm your class details.</p><Button to="/contact" variant="outline">Contact admissions</Button></article></div><div className="notice"><div><h3>Plan your visit</h3><p>{academyContact.address}</p><p>Office: <a href={academyContact.officeHref}>{academyContact.office}</a></p></div></div></div></section></>;
}

