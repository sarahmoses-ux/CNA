# Content verification

Reviewed on October 3, 2026. This is a local redesign; the live academy website and FalconPad services were not changed.

## Academy and contact

- [Homepage](https://cnatrainingacademy.net/): all six programs, academy services, student login, published class times, course-length FAQ, career support, approval claim, four news article links, three academy-specific student review summaries, social links, and image URLs.
- [About](https://cnatrainingacademy.net/about-us/): academy mission, practical instruction, experienced instructors, personalized learning, and student support. The redesign adds no staff biographies, historical claims, accreditation badges, or outcome statistics. Student experiences are attributed summaries of reviews on the academy homepage, not independently verified Google reviews.
- [Contact](https://cnatrainingacademy.net/contact-us/): address, emails, office/work phones, fax, and published office hours. The user-supplied contact details take precedence over inconsistent phone numbers elsewhere on the original site. The About page says assistance hours can vary with classes and clinicals, so visitors are encouraged to call ahead.
- [Admission requirements](https://cnatrainingacademy.net/admission-requirements/): identity requirements, minimum ages, background check, TB screening, AHA BLS/CPR, program prerequisites, and enrollment steps. This dedicated page takes precedence over the homepage FAQ's conflicting age/education statement. The redesign does not add an unverified diploma/GED requirement.

## Program sources

All six dedicated pages were retrieved and reviewed. Some failed through the web reader and were successfully downloaded with curl for local inspection.

- [CNA](https://cnatrainingacademy.net/certified-nurse-aide/)
- [CNA/HHA Deeming](https://cnatrainingacademy.net/cna-hha-deeming-program/)
- [HHA Deeming](https://cnatrainingacademy.net/home-health-aide-deeming-program/)
- [CMA](https://cnatrainingacademy.net/certified-medication-aide/)
- [ACMA Diabetes & Insulin](https://cnatrainingacademy.net/acma-diabetes-care-insulin/)
- [ACMA Nasogastric/Gastrostomy & Respiratory](https://cnatrainingacademy.net/acma-nasogastric-gastrostomy-respiratory/)

The dedicated admissions page supplies age requirements and foundational program prerequisites. Both advanced program pages additionally require current Oklahoma CNA and CMA certification. The advanced pages require background, TB, and AHA BLS/CPR prerequisites before skills validation/testing. General clinical requirements are described with program-specific confirmation through admissions.

Original program pages have conflicting quick facts, detailed hours, tuition, and schedules (and some contain unrelated university template text). The homepage's 4-6 week description is now included in the FAQ with explicit program-specific confirmation. Published morning, evening, and weekend time ranges are included as published class times, not guaranteed availability. Admissions must confirm current hours, duration, pricing, included fees/materials, and payment arrangements. No price, guaranteed credential, or guaranteed job outcome is added.

## Homepage and contact coverage audit

Both requested live pages were checked again on October 3, 2026.

| Source information | Local location |
| --- | --- |
| Academy identity, mission, practical learning | Home and About |
| Six programs and entry requirements | Home, Programs, six detail pages, Admissions |
| Office and work phones, fax, both emails, address, office hours | Contact and complete footer |
| Morning 7:00 AM-8:00 PM; evening 4:00 PM-10:00 PM; weekend 8:00 AM-4:00 PM | Home, Contact, Resources |
| Application, registration, student login, live calendar | Header, footer, Resources, relevant page actions |
| Contact form and original homepage application form | Contact inquiry link and application-form links |
| Facebook and Instagram URLs | Contact and footer |
| Admissions, support, financial assistance, policies, payment, testing, handbook, annual calendar, events, mission, licensing, partnerships | Resources directory using published source URLs |
| Four news articles | Homepage article links |
| Three academy-specific student reviews | Attributed summaries on Home |
| State approval and job-placement support claims | FAQs attributed to the academy |

Source exceptions: retain the dedicated admissions page's age rules instead of the conflicting homepage FAQ. The HHA card on the original homepage mistakenly describes a medication aide; retain the dedicated HHA page's content. Do not copy zero-valued counters or university-template reviews from 2022/2023. The state-approval FAQ reports the academy's claim; it is not an independent regulatory verification. Resources preserve the academy's published URLs; linked pages remain managed by the original website and their content/availability is not guaranteed by this local app.

## Existing services

- Apply/register: https://cnatraining.falconpad.com/authentication/sign-up
- Calendar: https://cnatraining.falconpad.com/public/program-schedules
- Student Login: https://cnatraining.falconpad.com/authentication — verified from actual Login anchors in the original homepage HTML.

These are external navigation links. No registration, payment, or student credentials are handled locally. No contact API exists in the original React starter, so the inquiry action opens the academy's existing contact form. The original application form is also accessible through a link. Local telephone/email actions remain available; there is no simulated submission confirmation.

## Images and fonts

Images were downloaded from the original academy website and stored locally. Descriptive alt text does not identify pictured people or imply they are current academy students.

- Logo: `/wp-content/uploads/2026/01/log_cna_tr-1.png`
- Hero: `/wp-content/uploads/2026/07/image-2.png`
- About: `/wp-content/uploads/2026/07/image-1024x564.png`
- Classroom: `/wp-content/uploads/2026/06/cna-2-1-768x512.webp`

PNG photos were converted to WebP at quality 85. Below-fold photos load lazily; the hero has high fetch priority. DM Sans and Manrope Latin variable fonts are hosted locally through Fontsource packages.

## Remaining owner input

- Confirm current tuition, payment options, course duration/hours, and the published enrollment schedules, especially the unusually long morning time range on the original pages.
- A higher-resolution transparent logo would improve sharpness on larger or high-density displays. The existing 122 × 43 logo is reused at its original size.
- Hosting an inquiry form locally would require an approved contact endpoint. The existing academy form, email, and phone actions are accessible now.
