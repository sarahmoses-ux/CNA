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

Home, Programs, six program detail pages, About, Admissions, Contact, Resources, and a 404 page are implemented. Program filtering and native accessible FAQ disclosures work without a backend. Home includes all six programs, published class times, academy news, attributed student experiences, and FAQs. Resources preserves the original academy's admissions, student support, calendar, and information links.

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

No deployment is included. The built frontend is in `dist`; student accounts also require the Node API and persistent database described below. Configure SPA fallback for frontend routes.

## Student accounts

Registration (`/register`) and sign in (`/login`) now use this website's own Node API. Successful registration creates an account in MongoDB Atlas and signs the student into `/dashboard`. Dashboard data is fetched using the authenticated session, never a student ID supplied by the browser. Passwords use salted scrypt hashes; random sessions use HttpOnly cookies. No student accounts or class records are seeded. Account creation is separate from enrollment and does not migrate existing FalconPad accounts.

Use Node 24 or newer. `npm.cmd run dev` runs both the website and its account API. Restart any development server that was already running before this change. Copy `.env.example` to `.env`, set `MONGODB_URI` to your Atlas connection string, and set `MONGODB_DB` to your database name (default `cna_academy`). The API stores users and sessions in MongoDB; credentials stay on the server. Allow the server IP in Atlas Network Access and create a database user with read/write access to this database. `.env` is ignored by Git. The site remains viewable without a connection, but registration and login report service unavailable. There is no SQLite fallback, automatic account migration, or seeded data.

For production, build the frontend and run `npm.cmd run start:api` with `NODE_ENV=production` and `APP_ORIGIN` set to the exact HTTPS website origin. Route `/api/*` to the API on localhost port 3001 and serve `dist` for the website with SPA fallback. Configure `MONGODB_URI` and `MONGODB_DB` on the server and arrange Atlas backups; a static-only host cannot run student accounts. HTTPS is required for production session cookies. The API deliberately ignores forwarded IP headers; configure trusted proxy handling before scaling beyond the single server, since rate limits currently group traffic by socket IP.

The dashboard currently displays real account details. Enrollment and schedules have empty states until an academy-managed enrollment system is connected. Email verification, password recovery, and administrative class assignment are not implemented yet. Do not use this account to submit medical documents or payments.


### Atlas validation

`npm.cmd run test:accounts` checks missing configuration and origin enforcement. The full authentication integration test runs only when `TEST_MONGODB_URI` points to a dedicated test cluster. It creates a uniquely named `cna_auth_test_` database, checks account persistence and session isolation, then deletes that test database. Never point it at a production cluster. Browser authentication checks also create test accounts; run them only with a separate test database. Existing private SQLite files are left untouched and are no longer used.
