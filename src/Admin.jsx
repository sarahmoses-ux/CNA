import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeading } from './components';
import { programs } from './data';
import { request } from './accountApi';
import './admin.css';

const blank = { name: '', email: '', phone: '', program: '', status: 'Inquiry', start_date: '', end_date: '', class_schedule: '', notes: '' };
export default function Admin() {
  const navigate = useNavigate();
  const [access, setAccess] = useState('loading');
  const [students, setStudents] = useState([]);
  const [draft, setDraft] = useState(null);
  const [query, setQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [nextCursor, setNextCursor] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const editorHeading = useRef(null);
  const editing = Boolean(draft);
  const studentId = draft?.id;
  useEffect(() => {
    if (editing && window.matchMedia('(max-width: 800px)').matches) {
      editorHeading.current?.focus({ preventScroll: true });
      editorHeading.current?.scrollIntoView({ block: 'start' });
    }
  }, [editing, studentId]);
  useEffect(() => {
    let active = true;
    request('me').then(async ({ user }) => {
      if (!active) return;
      if (user.role !== 'admin') { setAccess('denied'); return; }
      setAccess('allowed');
      const data = await request('admin-students');
      if (active) { setStudents(data.students); setNextCursor(data.nextCursor); }
    }).catch(failure => {
      if (!active) return;
      if (failure.status === 401) navigate('/login', { replace: true });
      else { setAccess(previous => previous === 'loading' ? 'error' : previous); setError(failure.message); }
    });
    return () => { active = false; };
  }, [navigate]);
  async function list(search = activeQuery, cursor) {
    setBusy(true); setError('');
    try {
      const params = new URLSearchParams({ q: search });
      if (cursor) params.set('cursor', cursor);
      const result = await request(`admin-students?${params}`);
      setStudents(previous => cursor ? [...previous, ...result.students] : result.students);
      setNextCursor(result.nextCursor); setActiveQuery(search);
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  async function open(id) {
    setBusy(true); setError(''); setNotice('');
    try { const data = await request(`admin-student?id=${id}`); setDraft(data.student); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  async function save(event) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const data = await request(draft.id ? 'admin-student' : 'admin-students', draft);
      setDraft(data.student); setNotice('Student record saved.');
      const params = new URLSearchParams({ q: activeQuery });
      const refreshed = await request(`admin-students?${params}`);
      setStudents(refreshed.students); setNextCursor(refreshed.nextCursor);
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  async function logout() {
    setBusy(true); setError('');
    try { await request('logout', {}); navigate('/login', { replace: true }); }
    catch (failure) { setError(failure.message); setBusy(false); }
  }
  const field = (name, value) => setDraft(previous => ({ ...previous, [name]: value }));
  if (access !== 'allowed') return <section className="section container"><h1>{access === 'denied' ? 'Administrator access required' : 'Administration'}</h1>{access === 'loading' ? <p role="status">Checking access...</p> : access === 'denied' ? <><p>Your student account cannot access staff records.</p><Link className="text-link" to="/dashboard">Return to your dashboard</Link></> : <><p role="alert">{error}</p><button className="button button-outline" onClick={() => window.location.reload()}>Try again</button></>}</section>;
  return <>
    <PageHeading eyebrow="STAFF ADMINISTRATION" title="Student records." description="Manage student contact details, enrollment, and class schedules." />
    <section className="section admin-section"><div className="container">
      <div className="admin-toolbar"><button className="button button-primary" disabled={busy} onClick={() => { setDraft({ ...blank }); setError(''); setNotice(''); }}>Add student</button><button className="button button-outline" disabled={busy} onClick={logout}>Sign out</button></div>
      {error && <p role="alert" className="account-error admin-error">{error}</p>}{notice && <p role="status">{notice}</p>}
      <div className={`admin-layout${draft ? ' admin-layout-editing' : ''}`}>
        <div className="admin-directory">
          <form className="admin-search" onSubmit={event => { event.preventDefault(); list(query); }}><label htmlFor="student-search">Find a student</label><div><input id="student-search" type="search" value={query} maxLength={100} onChange={event => setQuery(event.target.value)} placeholder="Search name or email" /><button className="button button-outline" disabled={busy}>Search</button></div></form>
          <h2>Students</h2>
          {!students.length && <p>{busy ? 'Loading records...' : 'No student records found.'}</p>}
          <ul className="admin-students">{students.map(student => <li key={student.id}><button disabled={busy} aria-pressed={draft?.id === student.id} onClick={() => open(student.id)}><strong>{student.name}</strong><span>{student.email}</span><span>{programs.find(program => program.slug === student.program)?.name || 'Program not selected'}</span><small>{student.status} · {student.has_account ? 'Student account linked' : 'Staff-added record'}</small></button></li>)}</ul>
          {nextCursor && <button className="button button-outline" disabled={busy} onClick={() => list(activeQuery, nextCursor)}>Load more students</button>}
        </div>
        <div className="admin-editor">{draft ? <form onSubmit={save} aria-busy={busy}>
          <div className="admin-editor-heading"><h2 ref={editorHeading} tabIndex={-1}>{draft.id ? 'Edit student' : 'New student'}</h2><button type="button" className="text-link" disabled={busy} onClick={() => setDraft(null)}>Close</button></div>
          <label>Full name<input value={draft.name} required maxLength={100} disabled={busy} onChange={event => field('name', event.target.value)} /></label>
          <label>Email address<input type="email" value={draft.email} required maxLength={254} readOnly={Boolean(draft.id)} disabled={busy} onChange={event => field('email', event.target.value)} /></label>
          <label>Phone number<input type="tel" value={draft.phone} maxLength={40} disabled={busy} onChange={event => field('phone', event.target.value)} /></label>
          <label><span id="admin-program-label">Program</span><select aria-labelledby="admin-program-label" value={draft.program} disabled={busy} onChange={event => field('program', event.target.value)}><option value="">Select a program</option>{programs.map(program => <option key={program.slug} value={program.slug}>{program.name}</option>)}</select></label>
          <label><span id="admin-status-label">Enrollment status</span><select aria-labelledby="admin-status-label" value={draft.status} disabled={busy} onChange={event => field('status', event.target.value)}>{['Inquiry', 'Applied', 'Enrolled', 'In progress', 'Completed', 'Withdrawn'].map(status => <option key={status}>{status}</option>)}</select></label>
          <div className="admin-date-fields"><label>Class start date<input type="date" value={draft.start_date} disabled={busy} onChange={event => field('start_date', event.target.value)} /></label><label>Class end date<input type="date" value={draft.end_date} min={draft.start_date || undefined} disabled={busy} onChange={event => field('end_date', event.target.value)} /></label></div>
          <label>Class schedule<input value={draft.class_schedule} maxLength={300} placeholder="For example, Monday–Friday, 9 AM–1 PM" disabled={busy} onChange={event => field('class_schedule', event.target.value)} /></label>
          <label>Staff notes<textarea value={draft.notes} rows={5} maxLength={2000} disabled={busy} onChange={event => field('notes', event.target.value)} /></label>
          <p className="small-text">Staff notes are visible only to administrators. Adding a record does not create a student login.</p>
          <button className="button button-primary" disabled={busy}>{busy ? 'Please wait...' : 'Save student'}</button>
        </form> : <div className="admin-empty"><h2>A place for every student.</h2><p>Select a student to view their record, or add a new student.</p></div>}</div>
      </div>
    </div></section>
  </>;
}
