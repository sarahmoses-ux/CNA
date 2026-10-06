import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, PageHeading } from './components';
import { academyContact } from './data';
async function request(path, body) {
  let response;
  try { response = await fetch(`/api/${path}`, { credentials: 'same-origin', ...(body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}) }); }
  catch { throw new Error('Unable to connect. Please try again.'); }
  let data;
  try { data = await response.json(); } catch { throw new Error('The account service is unavailable. Please try again later.'); }
  if (!response.ok) { const error = new Error(data.error || 'Please try again.'); error.status = response.status; throw error; }
  return data;
}
export function AccountForm({ register = false }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { let active = true; request('me').then(() => { if (active) navigate('/dashboard', { replace: true }); }).catch(() => {}); return () => { active = false; }; }, [navigate]);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    try { await request(register ? 'register' : 'login', fields); navigate('/dashboard', { replace: true }); }
    catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }
  return <><PageHeading eyebrow="Student account" title={register ? 'Your journey starts here.' : 'Welcome back.'} description={register ? 'Create your own academy account to access your personal student dashboard.' : 'Sign in to your academy account and open your dashboard.'} /><section className="section"><div className="container account-layout"><form className="account-form" onSubmit={submit} aria-busy={busy}><h2>{register ? 'Create an account' : 'Student sign in'}</h2>{register && <label>Full name<input name="name" autoComplete="name" required maxLength={100} /></label>}<label>Email address<input name="email" type="email" autoComplete="email" required maxLength={254} /></label><label htmlFor="account-password">Password</label><input id="account-password" name="password" type="password" autoComplete={register ? 'new-password' : 'current-password'} minLength={register ? 12 : 1} maxLength={128} required aria-describedby={register ? "password-help" : undefined} />{register && <p id="password-help" className="small-text">Use at least 12 characters.</p>}{error && <p className="account-error" role="alert">{error}</p>}<button className="button button-primary" type="submit" disabled={busy}>{busy ? 'Please wait...' : register ? 'Create account' : 'Sign in'}</button><p>{register ? 'Already have an account?' : 'New to the academy?'} <Link className="text-link" to={register ? '/login' : '/register'}>{register ? 'Sign in' : 'Create an account'}</Link></p></form><aside className="admissions-aside"><p className="eyebrow">IN-PERSON TRAINING</p><h2>Your account. Your next step.</h2><p>Your dashboard keeps your account details in one place. Classes take place at the academy, with practical instruction and hands-on learning.</p><p>Creating an account does not enroll you in a class. Contact admissions to confirm your program and schedule.</p><address>{academyContact.address}</address><div className="detail-block"><Button to="/programs" variant="outline">Explore programs</Button></div><p className="small-text">This account is separate from any existing FalconPad account.</p></aside></div></section></>;
}
export function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    request('me').then(data => { if (active) setUser(data.user); }).catch(failure => { if (!active) return; if (failure.status === 401) navigate('/login', { replace: true }); else setError(failure.message); });
    return () => { active = false; };
  }, [navigate, retry]);
  async function logout() {
    setBusy(true); setError('');
    try { await request('logout', {}); navigate('/login', { replace: true }); } catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }
  if (!user) return <section className="section container"><h1>Student dashboard</h1>{error ? <><p role="alert">{error}</p><button className="button button-primary" onClick={() => { setError(''); setRetry(retry + 1); }}>Try again</button></> : <p role="status">Loading your account...</p>}</section>;
  return <><PageHeading eyebrow="Student dashboard" title={`Welcome, ${user.name}.`} description="Your personal connection to CNA Training Academy." /><section className="section"><div className="container"><div className="section-heading"><div><p className="eyebrow">MY ACCOUNT</p><h2>Your student dashboard</h2></div><button className="button button-outline" disabled={busy} onClick={logout}>{busy ? 'Signing out...' : 'Sign out'}</button></div>{error && <p role="alert" className="account-error">{error}</p>}<div className="dashboard-grid"><article className="dashboard-card"><p className="eyebrow">PROFILE</p><h3>Account details</h3><dl><dt>Full name</dt><dd>{user.name}</dd><dt>Email address</dt><dd>{user.email}</dd><dt>Account created</dt><dd>{new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(user.created_at))}</dd></dl></article><article className="dashboard-card"><p className="eyebrow">ENROLLMENT</p><h3>Your next step</h3><p>No class enrollment is recorded in this account yet.</p><p>Speak with admissions to choose your program and confirm enrollment.</p><Button to="/admissions" variant="outline">Admission requirements</Button></article><article className="dashboard-card"><p className="eyebrow">IN-PERSON CLASSES</p><h3>Your class schedule</h3><p>No class schedule has been assigned to this account yet.</p><p>Admissions can help you find available sessions at the academy.</p><Button to="/contact" variant="outline">Contact admissions</Button></article></div><div className="notice"><div><h3>Plan your visit</h3><p>{academyContact.address}</p><p>Office: <a href={academyContact.officeHref}>{academyContact.office}</a></p></div></div></div></section></>;
}

