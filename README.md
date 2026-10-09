# CNA Training Academy

A responsive local redesign built on the existing React + Vite JavaScript starter, with React Router, reusable components, plain CSS, and locally hosted images and fonts.

## Run locally

```powershell
npm.cmd install
npm.cmd run dev
```

Open the localhost URL printed by Vite. It normally uses port 5173 and chooses another port if that port is occupied.

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd run preview
```

## Pages and content

Home, Programs, six program detail pages, About, Admissions, Contact, Resources, and a 404 page are implemented. Program filtering and native accessible FAQ disclosures work without a backend. Home includes all six programs, published class times, academy news, attributed student experiences, and FAQs. Resources opens local academy guidance pages for admissions, student support, calendars, and other information.

- `src/data.js`: central program content, eligibility, FAQs, and academy service URLs.
- `src/components.jsx`: shared header, footer, buttons, program cards, headings, and contact CTA.
- `src/App.jsx`: page layouts, routes, metadata, and navigation focus management.
- `src/index.css`: design tokens, responsive layouts, focus styles, and reduced motion behavior.
- `src/identity.css`: academy visual identity, content sections, and animation styles.
- `src/ContentSections.jsx`: published class times, social links, news, student experiences, and resource directory.
- `src/MotionEffects.jsx`: scroll reveals with reduced-motion support.
- `public/images`: original academy logo and optimized photos.
- `CONTENT-SOURCES.md`: verified sources, conflicting original details, and remaining owner input.

Registration and Student Login use the local account API. The public course calendar still links to FalconPad. Contact actions open email or telephone applications. This frontend collects no sensitive documents or payments and has no fabricated form confirmation.

## Browser checks

Start the development server first. Then run:

```powershell
$env:SITE_URL = 'http://127.0.0.1:5173'
npm.cmd run check:site
```

The browser check uses installed Microsoft Edge on Windows. Set `BROWSER_PATH` to a compatible browser executable on other systems. `SITE_URL` defaults to port 5174, the port used during development in this workspace.

Checks cover every route at 320, 390, 768, and 1440 pixels; horizontal overflow; images; page titles/descriptions; automated WCAG A/AA checks; mobile navigation; Escape behavior; program filters; FAQs; key academy service/contact links; and runtime errors. Screenshots are saved to the ignored `.reference/screenshots` folder. Automated accessibility checks complement manual review.

## Hosting later

Deployment configuration is included for the Vercel frontend and forwarding function, with the account server hosted on Render. Follow [LAUNCH.md](LAUNCH.md) to connect cnatrainingacademy.org, configure MongoDB, deploy, and verify the live site. Other hosts can serve `dist` with SPA fallback and proxy `/api/*` to the standalone Node API.

## Student accounts

Registration (`/register`) and sign in (`/login`) now use this website's own Node API. Registration first sends an email OTP through Resend; the account and session are created only after verification. Password login also requires a fresh email code before the student can access `/dashboard`. Dashboard data is fetched using the authenticated session, never a student ID supplied by the browser. Passwords use salted scrypt hashes; random sessions use HttpOnly cookies. No student accounts or class records are seeded. Account creation is separate from enrollment and does not migrate existing FalconPad accounts.

Use Node 24 or newer. `npm.cmd run dev` runs both the website and its account API. Restart any development server that was already running before this change. Copy `.env.example` to `.env`, configure `RESEND_API_KEY`, a verified-domain `RESEND_FROM`, and a randomly generated `OTP_SECRET` of at least 32 characters, then set `MONGODB_URI` to your Atlas connection string, and set `MONGODB_DB` to your database name (default `cna_academy`). The API stores users and sessions in MongoDB; credentials stay on the server. Allow the server IP in Atlas Network Access and create a database user with read/write access to this database. `.env` is ignored by Git. The site remains viewable without a connection, but registration and login report service unavailable. There is no SQLite fallback, automatic account migration, or seeded data.

For production, build the frontend and run `npm.cmd run start:api` with `NODE_ENV=production` and `APP_ORIGIN` set to the exact HTTPS website origin. Route `/api/*` to the API on localhost port 3001 and serve `dist` for the website with SPA fallback. Configure `MONGODB_URI` and `MONGODB_DB` on the server and arrange Atlas backups; a static-only host cannot run student accounts. HTTPS is required for production session cookies. The Render deployment accepts client-IP metadata only through the authenticated Vercel forwarding layer. Rate limits are stored in MongoDB and shared between server instances.

The dashboard currently displays real account details. Enrollment and schedules display the details saved by authorized staff, with empty states when nothing has been assigned. Resend email OTP verification is implemented for registration and login. Staff can manage students and assign programs, enrollment statuses, and class dates/schedules at `/admin`. Password recovery is not implemented yet. Do not use this account to submit medical documents or payments.


### Atlas validation

`npm.cmd run test:accounts` checks missing configuration and origin enforcement. The full authentication integration test runs only when `TEST_MONGODB_URI` points to a dedicated test cluster. It creates a uniquely named `cna_auth_test_` database, checks account persistence and session isolation, then deletes that test database. Never point it at a production cluster. The OTP browser check mocks API responses and creates no accounts or emails. The real Atlas integration test uses an injected test mailer and requires a dedicated test cluster. Existing private SQLite files are left untouched and are no longer used.

Administrator access is configured on Render with `ADMIN_EMAILS=sayflux04@gmail.com`. Staff use password + email OTP, then access `/admin`. Student records persist in MongoDB; staff notes are private. See [LAUNCH.md](LAUNCH.md) for setup and verification.
