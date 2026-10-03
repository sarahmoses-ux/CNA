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

Registration, current schedules, and Student Login link to the existing FalconPad services. Contact actions open email or telephone applications. This frontend collects no sensitive documents or payments and has no fabricated form confirmation.

## Browser checks

Start the development server first. Then run:

```powershell
$env:SITE_URL = 'http://127.0.0.1:5173'
npm.cmd run check:site
```

The browser check uses installed Microsoft Edge on Windows. Set `BROWSER_PATH` to a compatible browser executable on other systems. `SITE_URL` defaults to port 5174, the port used during development in this workspace.

Checks cover every route at 320, 390, 768, and 1440 pixels; horizontal overflow; images; page titles/descriptions; automated WCAG A/AA checks; mobile navigation; Escape behavior; program filters; FAQs; key academy service/contact links; and runtime errors. Screenshots are saved to the ignored `.reference/screenshots` folder. Automated accessibility checks complement manual review.

## Hosting later

No deployment is included. When hosting this BrowserRouter app later, configure the host to serve `index.html` for application routes so direct links and refreshes work. The built site is in `dist` after `npm.cmd run build`.
