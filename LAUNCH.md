# Launch: Vercel frontend + Render backend

The browser uses https://cnatrainingacademy.org. Vercel serves the frontend and forwards /api requests to Render. Render runs the account server and connects to MongoDB Atlas. The forwarding layer preserves secure login cookies on the website domain.

## Configure Resend before deploying Render

In Resend, add cnatrainingacademy.org as a sending domain. Copy the SPF/DKIM and other DNS records Resend supplies into Porkbun, preserving your website and existing mail records, and wait for Resend to show the domain as verified. Use verification@cnatrainingacademy.org as the sender, or another address on your verified domain. Create a sending API key scoped to that domain. Keep it private.

Add these variables on **Render only** (and to your private local .env if testing delivery locally):

| Name | Value |
| --- | --- |
| RESEND_API_KEY | Your private Resend sending API key |
| RESEND_FROM | `CNA Training Academy <verification@cnatrainingacademy.org>` |
| OTP_SECRET | A separately generated random secret of at least 32 characters |

Generate OTP_SECRET locally with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Keep it consistent across backend instances. It is separate from API_PROXY_SECRET and is never used by the frontend. Do not add these secrets to Vercel or to VITE_ variables. The Blueprint asks for the API key, supplies the sender address, and generates OTP_SECRET.

[Resend domain verification](https://resend.com/docs/dashboard/domains/introduction) | [Resend email API](https://resend.com/docs/api-reference/emails/send-email)

Registration and password sign-in both send a six-digit email code. Registration is held as a pending challenge until verification; no student account or session is created before the code succeeds. Login creates a new session only after the code succeeds. Codes expire after 10 minutes and allow five verification attempts. Resends wait 60 seconds, replace the old code, and do not reset attempts. Each email address is limited to five sends per hour; IP limits also apply. Pending challenges store keyed code hashes and password hashes, expire automatically in MongoDB, and are atomically consumed to prevent replay. Existing password-only sessions require a fresh OTP login after this update.

## 1. Deploy the backend on Render

Create a **Web Service** from the repository root, or use the included render.yaml Blueprint. The Blueprint creates one Node web service and generates API_PROXY_SECRET. Review the service plan in Render before creation. For a manual service use:

- Runtime: Node
- Node version: 24.x
- Build command: npm ci --omit=dev
- Start command: npm run start:api
- Health check path: /api/health

Set these Render environment variables:

| Name | Value |
| --- | --- |
| NODE_ENV | production |
| NODE_VERSION | 24 |
| MONGODB_URI | Existing private Atlas connection string |
| MONGODB_DB | Existing database name, or cna_academy |
| APP_ORIGIN | https://cnatrainingacademy.org |
| API_PROXY_SECRET | A long random secret shared with Vercel |

For a manual service, generate a secret locally with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` and save it privately on both platforms. Do not paste it into chat. The server automatically uses Render's PORT and binds to 0.0.0.0.

In MongoDB Atlas Network Access, allow the outbound IP ranges shown for this Render service. A successful local connection does not prove Render can connect. Keep the existing cluster; no database migration is required. Configure database-user permissions and backups appropriate to your Atlas plan.

Deploy, then open the Render service URL followed by /api/health. It must return {"ok":true}. The other account routes require the shared proxy secret and are intended to be called through the frontend.

[Render web services](https://render.com/docs/web-services) | [Render outbound IPs](https://render.com/docs/outbound-ip-addresses)

## 2. Connect Vercel to Render

Set these in the existing Vercel project's **Settings > Environment Variables**, scoped to **Production**:

| Name | Value |
| --- | --- |
| RENDER_API_URL | Exact HTTPS service origin, e.g. https://your-service.onrender.com, without /api |
| API_PROXY_SECRET | Exactly the same secret configured on Render |

Database credentials belong on Render. Vercel's API function is only a forwarding layer. Do not prefix any of these values with VITE_ or commit private .env files. The proxy forwards the browser's Origin and session cookies and authenticates its client-IP metadata with the shared secret. Unknown API paths cannot fall through to the frontend.

Deploy the updated repository root, including api, server/proxy.mjs, package.json, and vercel.json. Frontend build settings remain Vite, Node 24.x, build command npm run build, output directory dist. Uploading only dist omits the forwarding function. Redeploy after changing environment variables.

## 3. Connect the domain

In Vercel **Settings > Domains**, add cnatrainingacademy.org and www.cnatrainingacademy.org. Redirect www to https://cnatrainingacademy.org.

In Porkbun Domain Management > your domain > DNS, copy the exact A, CNAME, and any verification TXT records shown by Vercel. Leave the Host blank for a root record and use www for the www record. Replace conflicting website records only and retain email MX/TXT records. Wait for valid configuration and working HTTPS.

[Vercel domain setup](https://vercel.com/docs/domains/set-up-custom-domain) | [Porkbun DNS editing](https://kb.porkbun.com/article/68-how-to-edit-dns-records)

APP_ORIGIN on Render must match the browser website exactly, with no trailing slash. Production login requests from the old vercel.app URL will be rejected with the custom-domain origin. For previews, use a separate backend/database and matching exact preview origin.

## 4. Verify before launch

Run npm.cmd run check:launch after deployment. Set SITE_URL to a different HTTPS frontend origin if needed. The read-only check verifies frontend routes, HTTPS, MongoDB readiness through the proxy, unauthenticated account access, and unknown API paths. It creates no accounts.

Then create your own account in a browser, enter the code received at your real email address, refresh the dashboard, sign out, sign back in with a fresh code, and confirm another browser cannot access your profile without signing in. Repeat on mobile.

Troubleshooting:

- Render health fails: check MongoDB settings, Atlas Network Access, RESEND_API_KEY, RESEND_FROM, and OTP_SECRET, then Render logs. Health checks email configuration but do not send a test email.
- Codes do not arrive: verify the sender domain, check the Resend dashboard and spam folder, and confirm the sending key can send from RESEND_FROM.
- Website /api/health returns 503: check Vercel RENDER_API_URL and API_PROXY_SECRET.
- Account requests return 403 with a proxy error: the secrets differ.
- Login/register return 403 with an origin error: APP_ORIGIN differs from the browser domain.
- Proxy returns 502: Render is unreachable, timed out, or returned an unexpected response. Inspect Render and Vercel logs.

Render free web services can sleep. For predictable launch availability, review a service plan that stays running; no plan has been purchased by these code changes.

## Launch scope

Registration, Resend email verification, password-and-OTP login, logout, a student dashboard, and staff administration are implemented. Account creation does not enroll a student. Payments, document uploads, and password recovery are not implemented. Staff can assign enrollment statuses, programs, and class dates/schedules in student records; these details appear on the linked student dashboard. Resource pages direct visitors to admissions for current policies, handbooks, and payment arrangements; news pages are short training guides. Review these behaviors and contact details before announcing enrollment features.

Local build, lint, and account/proxy tests passed. The local Atlas connection was verified without creating student records. The real persistence integration test requires TEST_MONGODB_URI for a dedicated test cluster and was not run against the live database. Live Render/Vercel verification still requires deployment and dashboard configuration.

OTP validation: isolated backend tests cover expiry, failed codes, single use, resend limits, delivery failure, and session protection. Run npm.cmd run check:otp-ui against a local Vite server (set SITE_URL if needed) for mocked browser checks. These checks send no real emails. Complete a real-inbox delivery check before launch; that cannot be confirmed without configuring Resend.

## Staff administration

The /admin page is restricted to verified accounts whose email is in Render's ADMIN_EMAILS setting. Set ADMIN_EMAILS=sayflux04@gmail.com (the included Blueprint already supplies it). More staff addresses can be added as a comma-separated list. This setting is server-only. No client registration field or student record can grant administrator access.

Create an account using sayflux04@gmail.com, verify the email OTP, then sign in with your password and OTP. Authorized staff are redirected to /admin. Existing accounts can sign in normally. If the allowlist is empty, no account has administrator access. Updating the allowlist requires the Render service to restart/redeploy.

Staff can create, search, reopen, and update student records with name, email, phone, program, enrollment status, class dates, class schedule, and staff notes. Records are saved in the students collection in MongoDB. Newly verified student accounts are linked automatically; existing verified accounts are included on the first directory load. Manual records do not create login accounts. A student who later verifies the same email is linked to the existing record, preserving staff notes and class assignments. Saved emails cannot be changed in this editor because they identify the linked account.

Students can access only their own program/enrollment/class details through /api/student-record. Staff notes, other students' records, password hashes, and session tokens are never included in student-facing responses. Both the admin screen and every admin API request enforce access. There is no delete operation in this version.

Run npm.cmd run check:admin-ui against a local Vite server (set SITE_URL if needed) for mocked UI checks. Backend tests cover unauthorized access, record saving/reopening, account linking, validation, search, pagination, and separation of private notes. Live MongoDB persistence and Render/Vercel access still require deployment verification.
