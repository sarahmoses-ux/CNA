import { Link } from 'react-router-dom';
import { ArrowUpRight, CalendarDays } from 'lucide-react';
import { academyNews, classSchedules, resourceGroups, services, studentExperiences } from './data';

export function SocialLinks() {
  return <div className="social-links"><a href={services.facebook} aria-label="CNA Training Academy on Facebook">Facebook <ArrowUpRight size={16} aria-hidden="true" /></a><a href={services.instagram} aria-label="CNA Training Academy on Instagram">Instagram <ArrowUpRight size={16} aria-hidden="true" /></a></div>;
}

export function ClassSchedule() {
  return <div className="class-schedule"><div className="schedule-heading"><CalendarDays size={22} aria-hidden="true" /><h3>Published class times</h3></div><dl>{classSchedules.map(([label, time]) => <div key={label}><dt>{label}</dt><dd>{time}</dd></div>)}</dl><p className="small-text">Confirm your program's days and times with admissions before enrolling.</p><a href={services.calendar} className="text-link">View available sessions <ArrowUpRight size={17} aria-hidden="true" /></a></div>;
}

export function NewsSection() {
  return <section className="section news-section"><div className="container"><div className="section-heading"><div><p className="eyebrow">NEWS & IDEAS</p><h2>A little knowledge.<br />A new possibility.</h2></div><a className="text-link" href="https://cnatrainingacademy.net/blog/">All academy news <ArrowUpRight size={18} aria-hidden="true" /></a></div><div className="news-grid">{academyNews.map(([title, href, category], index) => <article key={href}><span className="eyebrow">{category}</span><h3><a href={href}>{title}</a></h3><a className="text-link" href={href}>Read article <ArrowUpRight size={18} aria-hidden="true" /></a><span className="news-number" aria-hidden="true">0{index + 1}</span></article>)}</div></div></section>;
}

export function StudentExperiences() {
  return <section className="section experiences-section"><div className="container"><p className="eyebrow">STUDENT EXPERIENCES</p><h2>Different beginnings.<br />Shared purpose.</h2><p className="experiences-source">From student reviews published by the academy.</p><div className="experiences-grid">{studentExperiences.map(({ name, year, title, summary }) => <article key={name}><h3>{title}</h3><p>{summary}</p><div><strong>{name}</strong><span>Class of {year}</span></div></article>)}</div></div></section>;
}

export function ResourceDirectory() {
  return <div className="resource-directory">{resourceGroups.map(group => <section key={group.title}><h2>{group.title}</h2><ul>{group.links.map(([label, href]) => <li key={label}>{href.startsWith('/') ? <Link to={href}>{label}<ArrowUpRight size={17} aria-hidden="true" /></Link> : <a href={href}>{label}<ArrowUpRight size={17} aria-hidden="true" /></a>}</li>)}</ul></section>)}</div>;
}
