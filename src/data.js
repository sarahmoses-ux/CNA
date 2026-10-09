export const services = {
  apply: '/register',
  calendar: 'https://cnatraining.falconpad.com/public/program-schedules',
  login: '/login',
  directions: 'https://www.google.com/maps/dir/?api=1&destination=7463+NW+23rd+St+Bethany+OK+73008',
  inquiry: 'mailto:info@cnatrainingacademy.net',
  applicationForm: '/register',
  facebook: 'https://www.facebook.com/CNAtrainingacademy',
  instagram: 'https://www.instagram.com/cnatrainingacademy1/',
};
export const academyContact = {
  office: '(405) 315-1357', officeHref: 'tel:+14053151357',
  work: '(405) 740-6594', workHref: 'tel:+14057406594',
  fax: '(405) 506-0373',
  emails: ['info@cnatrainingacademy.net', 'cnatrainingacademy1@gmail.com'],
  address: '7463 NW 23rd St., Bethany, OK 73008',
  officeHours: 'Monday-Sunday, 7:00 AM-8:00 PM',
};
export const classSchedules = [
  ['Morning classes', '7:00 AM-8:00 PM'],
  ['Evening classes', '4:00 PM-10:00 PM'],
  ['Weekend classes', '8:00 AM-4:00 PM'],
];
const academyPage = path => `/academy/${path}`;
export const resourceGroups = [
  { title: 'Admissions', links: [
    ['Apply / Register', services.apply], ['Application form', services.applicationForm],
    ['How to apply', academyPage('apply-online')], ['Schedule an appointment', academyPage('schedule-appointment')],
    ['Admission requirements', '/admissions'], ['Financial assistance', academyPage('financial-assistance')],
    ['Student policies', academyPage('student-policies')],
  ] },
  { title: 'Student support', links: [
    ['Student Login', services.login], ['Current students', academyPage('current-students')],
    ['Future students', academyPage('future-students')], ['Make a payment', academyPage('make-a-payment')],
    ['Student services', academyPage('student-services')], ['Career services', academyPage('career-services')],
    ['Testing site', academyPage('testing-site')], ['Student handbook', academyPage('student-handbook')],
  ] },
  { title: 'Calendars & academy', links: [
    ['Live course calendar', services.calendar], ['Course schedule', academyPage('view-course-schedule')],
    ['School annual calendar', academyPage('school-annual-calendar')], ['Events', academyPage('events')],
    ['News & articles', academyPage('blog')], ['About the academy', '/about'],
    ['Mission & vision', academyPage('mission-vision')], ['Approvals & licensing', academyPage('approvals-licensing')],
    ['Frequently asked questions', academyPage('faqs')], ['Partnerships', academyPage('partnerships')],
  ] },
];
export const academyNews = [
  ['CPR certification for healthcare students', academyPage('why-cpr-certification-is-crucial-for-healthcare-students'), 'Training essentials'],
  ['Choosing between CNA and HHA', academyPage('cna-vs-hha-which-healthcare-certification-is-right-for-you'), 'Explore your path'],
  ['Starting a CNA career in Oklahoma', academyPage('5-reasons-to-start-your-career-as-a-certified-nurse-aide-in-oklahoma'), 'Career beginnings'],
  ['Your next step: medication aide training', academyPage('why-becoming-a-certified-medication-aide-cma-is-the-next-step-in-your-healthcare-career'), 'Continue growing'],
];
export const studentExperiences = [
  { name: 'Michael', year: '2024', title: 'Confidence through practice', summary: 'Describes practical instruction, supportive teachers, certification, and work in a nursing home.' },
  { name: 'Jessica', year: '2024', title: 'Support around a busy life', summary: 'Highlights evening and weekend learning, enrollment guidance, and support while balancing work and study.' },
  { name: 'Denise', year: '2025', title: 'Ready for the next chapter', summary: 'Credits skills practice and mock examinations with preparing for certification and a healthcare career.' },
];
export const generalRequirements = [
  'Government-issued photo ID and Social Security card.',
  'A criminal background check before clinical placement and state eligibility for training and certification.',
  'A current negative TB test before clinicals.',
  'American Heart Association BLS/CPR certification before clinicals. Ask admissions about CPR class enrollment.',
];
export const programPhotos = {
  'certified-nurse-aide': '/images/classroom.webp',
  'cna-hha-deeming': '/images/cna-4-1.webp',
  'home-health-aide-deeming': '/images/care-team.webp',
  'certified-medication-aide': '/images/cna-3-1.webp',
  'acma-diabetes-insulin': '/images/cna-5-1.webp',
  'acma-enteral-respiratory': '/images/cna-6-1.webp',
};
export const programs = [
  { slug: 'certified-nurse-aide', code: 'CNA', name: 'Certified Nurse Aide (CNA)', category: 'Start your career', icon: 'care', description: 'Build a foundation in patient care and prepare for your next step in healthcare.', overview: 'Prepare to assist patients with daily care and support nursing teams. This instructor-led program combines classroom learning, skills lab practice, and clinical experience in a licensed nursing home. Successful completion prepares students for the Oklahoma State Nurse Aide Competency Exam.', requirements: ['At least 16 years old.', 'No prior certification required.'], learning: ['Essential daily care and patient support', 'Classroom instruction and hands-on skills practice', 'Supervised clinical experience in a nursing home'], source: 'certified-nurse-aide' },
  { slug: 'cna-hha-deeming', code: 'CNA / HHA', name: 'CNA/HHA Deeming Program', category: 'Start your career', icon: 'people', description: 'Prepare for care in both nursing facilities and home health settings.', overview: 'Combine foundational nurse aide training with Home Health Aide deeming instruction. Students complete CNA classroom, lab, and nursing home clinical training before continuing into home health skills. Certification depends on successful completion and applicable state examination requirements.', requirements: ['At least 16 years old.', 'No prior certification required.'], learning: ['Resident care, safety, and infection control', 'Skills lab and nursing home clinical training', 'Home health skills to support clients at home'], source: 'cna-hha-deeming-program' },
  { slug: 'home-health-aide-deeming', code: 'HHA', name: 'Home Health Aide Deeming Program', category: 'Advance your skills', icon: 'home', description: 'Bring your CNA experience into compassionate care at home.', overview: 'Designed for current CNAs, this program builds skills for safe, compassionate care in home and community settings. Instructor-led classroom and skills lab learning cover personal care, home safety, and support with daily living.', requirements: ['At least 16 years old.', 'Current Oklahoma CNA certification.'], learning: ['Personal care, communication, and patient rights', 'Home safety, fall prevention, and safe transfers', 'Nutrition support and household management basics'], source: 'home-health-aide-deeming-program' },
  { slug: 'certified-medication-aide', code: 'CMA', name: 'Certified Medication Aide (CMA)', category: 'Advance your skills', icon: 'medication', description: 'Build on your CNA foundation with safe medication administration.', overview: 'For current CNAs ready to expand their skills, this program prepares students to support licensed nurses with medication administration in long-term care and assisted living. Training includes classroom instruction, skills lab practice, and supervised clinical rotation. Successful graduates are eligible for the Oklahoma Medication Aide State Exam.', requirements: ['At least 18 years old.', 'Current Oklahoma CNA certification.'], learning: ['Safe and effective medication administration', 'Instructor-led classroom and skills lab training', 'Supervised clinical rotation in a nursing facility'], source: 'certified-medication-aide' },
  { slug: 'acma-diabetes-insulin', code: 'ACMA', name: 'ACMA – Diabetes Care & Insulin', category: 'Specialized training', icon: 'diabetes', description: 'Develop advanced skills in diabetes care under licensed nurse supervision.', overview: 'Advanced training for medication aides in blood glucose monitoring, insulin administration, and diabetes-related care. Classroom learning, hands-on practice, and competency evaluation emphasize safety, documentation, and the permitted scope of practice under licensed nurse supervision.', requirements: ['At least 18 years old.', 'Current Oklahoma CNA and CMA certifications.', 'Complete training prerequisites before skills validation and testing.'], learning: ['Diabetes management and blood glucose monitoring', 'Safe insulin preparation and administration', 'Recognizing glucose changes, reporting, and documentation'], source: 'acma-diabetes-care-insulin' },
  { slug: 'acma-enteral-respiratory', code: 'ACMA', name: 'ACMA – Nasogastric/Gastrostomy & Respiratory', category: 'Specialized training', icon: 'respiratory', description: 'Expand your skills in enteral feeding support and respiratory care.', overview: 'Specialized training for medication aides in feeding tube medication support and respiratory care under licensed nurse supervision. Classroom instruction, skills lab practice, and competency demonstrations emphasize infection control, resident safety, and communication within state and facility requirements.', requirements: ['At least 18 years old.', 'Current Oklahoma CNA and CMA certifications.', 'Complete training prerequisites before skills validation and testing.'], learning: ['Nasogastric and gastrostomy tube care support', 'Oxygen safety and respiratory observation', 'Documentation, communication, and scope of practice'], source: 'acma-nasogastric-gastrostomy-respiratory' },
];
export const faqs = [
  ['Can I apply in person?', 'Yes. The academy offers online applications and in-person enrollment. Contact admissions to arrange a visit.'],
  ['Is the training state-approved?', 'The academy identifies its training as approved by the Oklahoma State Department of Health. Contact admissions for current program approval details.'],
  ['Is career support available?', 'The academy offers job-placement support and connections with local healthcare employers. Ask admissions about current services and employment partners.'],
  ['How do I get started?', 'Explore our programs, check the course calendar, and create your academy account and contact admissions. Admissions can help you choose a program and confirm eligibility.'],
  ['Do I need healthcare experience?', 'No prior certification is required for CNA or the CNA/HHA program. HHA Deeming and CMA require a current Oklahoma CNA certification. Both advanced ACMA programs require current Oklahoma CNA and CMA certifications.'],
  ['What are the age requirements?', 'The dedicated admissions requirements list a minimum age of 16 for CNA, CNA/HHA, and HHA Deeming, and 18 for the other programs. Additional requirements vary by program.'],
  ['How long is a course, and when does it start?', 'The academy homepage describes most programs as lasting 4-6 weeks, depending on the schedule. Length and training hours vary by program; confirm your specific course with admissions and check the live calendar for available sessions.'],
  ['How much is tuition? Are payment plans available?', 'Admissions can confirm current tuition, included materials, fees, and available payment arrangements. Call (405) 315-1357 before making your enrollment plans.'],
];


