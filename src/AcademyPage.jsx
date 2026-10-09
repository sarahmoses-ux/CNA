import { Link, useParams } from 'react-router-dom';
import { Button, ContactCTA, PageHeading } from './components';
import { academyNews, resourceGroups } from './data';
import { ClassSchedule, NewsSection } from './ContentSections';

const guidance = {
  'apply-online': ['Choose your program, create a student account, and contact admissions to confirm your enrollment requirements.', '/register', 'Create account'],
  'schedule-appointment': ['Contact the academy to arrange an admissions appointment or an in-person visit.', '/contact', 'Contact admissions'],
  'financial-assistance': ['Ask admissions about current tuition, payment arrangements, and any available financial assistance before enrolling.', '/contact', 'Discuss tuition'],
  'student-policies': ['Request the current student policies from admissions and review them before enrollment.', '/contact', 'Request policies'],
  'current-students': ['Sign in to your student account to access your dashboard. Contact the academy for class-specific support.', '/login', 'Student login'],
  'future-students': ['Explore the training programs and review admission requirements to plan your next step.', '/programs', 'Explore programs'],
  'make-a-payment': ['Contact admissions to confirm your balance and arrange payment through an academy-approved channel.', '/contact', 'Arrange payment'],
  'student-services': ['Contact the academy for help with enrollment, class schedules, or student support.', '/contact', 'Request support'],
  'career-services': ['Ask admissions about available career support and connections with healthcare employers.', '/contact', 'Ask about career support'],
  'testing-site': ['Contact the academy to confirm testing arrangements, eligibility, dates, and required documents for your program.', '/contact', 'Ask about testing'],
  'student-handbook': ['Request the current student handbook from the academy for enrollment, attendance, and training policies.', '/contact', 'Request handbook'],
  'view-course-schedule': ['Review the published class times below and confirm your program’s available sessions with admissions.', '/contact', 'Confirm a session'],
  'school-annual-calendar': ['Contact the academy for current term dates, holidays, and scheduled closures.', '/contact', 'Request calendar'],
  events: ['Contact the academy for upcoming events and opportunities to visit.', '/contact', 'Ask about events'],
  'mission-vision': ['Learn about the academy’s approach to practical healthcare education and student support.', '/about', 'About the academy'],
  'approvals-licensing': ['Request current program approval and licensing documentation from admissions before enrolling.', '/contact', 'Request approval details'],
  faqs: ['Review admissions information or contact the academy with questions about your training.', '/admissions', 'Admissions information'],
  partnerships: ['Contact the academy to discuss healthcare education and employment partnerships.', '/contact', 'Discuss a partnership'],
  'why-cpr-certification-is-crucial-for-healthcare-students': ['BLS/CPR certification is included in the academy’s general clinical requirements. Ask admissions how this requirement applies to your chosen program and about CPR class enrollment.', '/admissions', 'Review requirements'],
  'cna-vs-hha-which-healthcare-certification-is-right-for-you': ['The academy offers nurse aide and home health aide training options. Compare program descriptions, eligibility, and learning goals to choose your next step.', '/programs', 'Compare programs'],
  '5-reasons-to-start-your-career-as-a-certified-nurse-aide-in-oklahoma': ['The CNA program combines classroom learning, skills practice, and supervised clinical experience. Explore the program and speak with admissions about enrollment.', '/programs/certified-nurse-aide', 'Explore CNA training'],
  'why-becoming-a-certified-medication-aide-cma-is-the-next-step-in-your-healthcare-career': ['The CMA program builds on a current Oklahoma CNA certification with medication administration training. Review the eligibility and training details before applying.', '/programs/certified-medication-aide', 'Explore CMA training'],
};

export default function AcademyPage() {
  const { slug } = useParams();
  if (slug === 'blog') return <><PageHeading eyebrow="News & ideas" title="Explore your next step." description="Training guides and academy resources." /><NewsSection /><ContactCTA /></>;
  const path = `/academy/${slug}`;
  const entry = [...resourceGroups.flatMap(group => group.links), ...academyNews].find(([, href]) => href === path);
  const content = guidance[slug];
  if (!entry || !content) return <><PageHeading eyebrow="Academy" title="Page not found." /><section className="section container"><Link to="/resources">Browse resources</Link></section></>;
  return <><PageHeading eyebrow="Academy resources" title={entry[0]} /><section className="section"><div className="container"><p>{content[0]}</p><div className="button-row"><Button to={content[1]}>{content[2]}</Button><Button to="/resources" variant="outline">All resources</Button></div>{slug === 'view-course-schedule' && <ClassSchedule />}</div></section><ContactCTA /></>;
}
