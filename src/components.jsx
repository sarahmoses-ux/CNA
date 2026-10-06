import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ArrowUpRight, ArrowRight, CalendarDays, Phone, Menu, X, MapPin, HeartPulse, Users, House, Pill, Droplets, Wind, BookOpen, HeartHandshake } from 'lucide-react';
import { academyContact, programPhotos, programs, services } from './data';
import { SocialLinks } from './ContentSections';
import { pageVisuals } from './pageVisuals';
export function Icon({ type, ...props }) {
  const Component = { care: HeartPulse, people: Users, home: House, medication: Pill, diabetes: Droplets, respiratory: Wind, book: BookOpen, support: HeartHandshake }[type] || HeartPulse;
  return <Component aria-hidden="true" {...props} />;
}
export function Button({ to, href, children, variant = 'primary', arrow = true, className = '' }) {
  const content = <>{children}{arrow && <ArrowRight size={17} aria-hidden="true" />}</>;
  const classes = `button button-${variant} ${className}`;
  const route = to || (href?.startsWith('/') && !href.startsWith('//') ? href : undefined);
  return route ? <Link className={classes} to={route}>{content}</Link> : <a className={classes} href={href}>{content}</a>;
}
export function Brand() {
  return <Link to="/" className="brand" aria-label="CNA Training Academy home"><img src="/images/academy-logo.png" width="122" height="43" alt="" /><span className="brand-type">CNA<span>TRAINING ACADEMY</span></span></Link>;
}
const navItems = [['/', 'Home'], ['/programs', 'Programs'], ['/about', 'About Us'], ['/admissions', 'Admissions'], ['/resources', 'Resources'], ['/contact', 'Contact']];
const copyrightYear = new Date().getFullYear();
export function Header() {
  const [openPath, setOpenPath] = useState(null);
  const toggle = useRef(null);
  const location = useLocation();
  const open = openPath === location.pathname;
  const setOpen = (value) => setOpenPath(value ? location.pathname : null);
  useEffect(() => {
    if (!open) return;
    const close = (event) => { if (event.key === 'Escape') { setOpenPath(null); toggle.current?.focus(); } };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [open]);
  return <header><a className="skip-link" href="#main">Skip to main content</a><div className="utility-bar"><div className="container utility-inner"><span><MapPin size={13} aria-hidden="true" /> Bethany, Oklahoma <span className="utility-divider">|</span> Your future in healthcare starts here.</span><div><a href={services.calendar}><CalendarDays size={13} aria-hidden="true" /> Course Calendar</a><Link to={services.login}>Student Login <ArrowUpRight size={13} aria-hidden="true" /></Link></div></div></div><div className="container navigation"><Brand /><button ref={toggle} className="menu-toggle" aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open} aria-controls="primary-navigation" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button><nav id="primary-navigation" aria-label="Main navigation" className={open ? 'nav-open' : ''}>{navItems.map(([to, label]) => <NavLink key={to} to={to} end={to === '/'}>{label}</NavLink>)}<Link to="/dashboard">Dashboard</Link><Button to={services.apply}>Create account</Button></nav></div></header>;
}
export function Footer() {
  return <footer><div className="container footer-grid">
    <div className="footer-intro"><Brand /><p>Practical skills. Compassionate care.<br />A meaningful future in healthcare.</p><span className="footer-location"><MapPin size={15} aria-hidden="true" /> Bethany, Oklahoma</span><SocialLinks /></div>
    <div><h3>Explore</h3><Link to="/about">About the academy</Link><Link to="/programs">Our programs</Link><Link to="/admissions">Admissions</Link><Link to="/resources">Student & academy resources</Link><Link to="/contact">Contact us</Link></div>
    <div><h3>Student resources</h3><Link to={services.apply}>Create account <ArrowUpRight size={13} aria-hidden="true" /></Link><a href={services.calendar}>Course Calendar <ArrowUpRight size={13} aria-hidden="true" /></a><Link to={services.login}>Student Login <ArrowUpRight size={13} aria-hidden="true" /></Link><Link to="/resources">Policies, support & payments <ArrowUpRight size={13} aria-hidden="true" /></Link></div>
    <div className="footer-contact"><h3>Let's connect</h3><a href={academyContact.officeHref}>Office: {academyContact.office}</a><a href={academyContact.workHref}>Work: {academyContact.work}</a><p className="footer-fax">Fax: {academyContact.fax}</p>{academyContact.emails.map(email => <a key={email} href={`mailto:${email}`}>{email}</a>)}<a href={services.directions}>{academyContact.address}</a><p>{academyContact.officeHours}</p></div>
  </div><div className="container footer-bottom"><span>Copyright {copyrightYear} CNA Training Academy. All rights reserved.</span><span>Education with care. Care with confidence.</span></div></footer>;
}
export function PageHeading({ eyebrow, title, description, children }) {
  const { pathname } = useLocation();
  const visual = pageVisuals[pathname];
  return <section className={`page-heading ${visual ? 'page-heading-visual' : ''}`} data-tone={visual?.tone}><div className="container page-heading-layout"><div className="page-heading-copy"><div className="breadcrumb"><Link to="/">Home</Link><span>/</span><span>{eyebrow}</span></div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="page-description">{description}</p>{children}</div>{visual && <div className="page-feature-image"><img src={visual.src} alt={visual.alt} width="800" height="650" fetchPriority="high" /><span className="page-image-caption">{visual.illustration ? "TRAINING ILLUSTRATION" : "CNA TRAINING ACADEMY"} <span>LEARN. PRACTICE. CARE.</span></span></div>}</div></section>;
}
export function ProgramCard({ program, index }) {
  return <article className="program-card"><div className="program-photo"><img src={programPhotos[program.slug]} alt="" loading="lazy" width="768" height="512" /></div><div className="card-top"><span className="icon-tile"><Icon type={program.icon} size={25} /></span><span className="program-code">{program.code}</span></div><span className="card-category">{program.category}</span><h3><Link to={`/programs/${program.slug}`}>{program.name}</Link></h3><p>{program.description}</p><Link className="card-link" to={`/programs/${program.slug}`}>Explore program <ArrowUpRight size={18} aria-hidden="true" /></Link><span className="card-number" aria-hidden="true">0{index + 1}</span></article>;
}
export function ProgramGrid({ list = programs }) { return <div className="program-grid">{list.map((program, index) => <ProgramCard program={program} index={index} key={program.slug} />)}</div>; }
export function ContactCTA() {
  return <section className="contact-cta"><div className="container cta-inner"><div><p className="eyebrow">YOUR NEXT CHAPTER</p><h2>Ready to make a difference?</h2><p>Let’s find the right healthcare training program for you.</p></div><div className="cta-actions"><Button href={services.apply} variant="light">Create account</Button><a className="cta-phone" href="tel:+14053151357"><Phone size={17} aria-hidden="true" /> Talk to admissions</a></div></div></section>;
}




