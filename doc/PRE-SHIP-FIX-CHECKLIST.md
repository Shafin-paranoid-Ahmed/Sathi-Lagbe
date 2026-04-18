# Pre-deployment fix checklist

Use this as a master backlog. Items from [ISSUES.md](ISSUES.md) are merged with **current** repo realities (some security doc claims are **stale** vs today’s `server/index.js` and auth stack).

---

## A. Deployment and runtime (blockers for “it works in prod”)

| # | Item | Notes |
|---|------|--------|
| A1 | **Vercel server export** | `server/index.js` sets `module.exports = app` in the `VERCEL` branch (~402–403) but **line 430 always** sets `module.exports = { app, server }`, overwriting the handler. Fix so the deployed entry is what `@vercel/node` expects (typically **`app` only**). |
| A2 | **Socket.IO on serverless** | Long-lived WebSockets do not match standard Vercel serverless. Decide: **separate socket host**, **managed realtime**, or **accept broken/limit realtime** on Vercel API. |
| A3 | **Socket.IO CORS in production** | `server/utils/socket.js` hardcodes `origin: ['http://localhost:3000', 'http://localhost:5173']`. Production frontends will be **blocked** unless this matches real origins (env-driven list). |
| A4 | **Background jobs on Vercel** | Notification `setInterval` and `startAutoStatusScheduler` are **disabled** when `VERCEL === '1'` (`server/index.js` ~406–427). If you deploy API only to Vercel, add **Vercel Cron + secured routes** or a **worker** elsewhere, or those features never run. |
| A5 | **Env and secrets on host** | `JWT_SECRET`, `MONGO_URI`, CORS `FRONTEND_URL` / `CLIENT_URL`, Cloudinary, Redis URL, Google keys: must exist on **each** environment; client `VITE_*` baked at build. |
| A6 | **MongoDB Atlas network** | Allow serverless egress (often `0.0.0.0/0` on Atlas unless you use fixed egress). |

---

## B. Product / UX (from ISSUES + code review)

| # | Item | Source |
|---|------|--------|
| B1 | **Socket.IO duplicate listeners** | [ISSUES.md](ISSUES.md) §1 — audit other components beyond `NotificationBell.jsx`. |
| B2 | **Fragmented auth / 401 handling** | [ISSUES.md](ISSUES.md) §2 — unify session cleanup (e.g. `client/src/api/auth.js` vs ride components). |
| B3 | **Phone validation in one place** | [ISSUES.md](ISSUES.md) §4 — dedupe server + client regex/messages (`server/controllers/authController.js`, `server/controllers/userController.js`, `client/src/pages/Signup.jsx`). |
| B4 | **SOS contact filtering** | [ISSUES.md](ISSUES.md) §5 — `client/src/pages/SOS.jsx`. |
| B5 | **Consistent API error shape** | [ISSUES.md](ISSUES.md) §6 — standardize `{ success, error, message }` (or chosen contract) across controllers. |
| B6 | **Remove or gate debug logging** | [ISSUES.md](ISSUES.md) §7 — controllers/services; avoid leaking data in prod logs. |
| B7 | **File upload validation and limits** | [ISSUES.md](ISSUES.md) §8 — multer memory storage: type/size/count, virus scanning policy if required. |
| B8 | **Auto-status reliability** | [ISSUES.md](ISSUES.md) §9 — `server/services/autoStatusService.js`, timezone + scheduler when not on Vercel. |
| B9 | **Google Maps / location fallbacks** | [ISSUES.md](ISSUES.md) §10 — `client/src/components/LocationAutocomplete.jsx`. |
| B10 | **Dark mode cross-tab** | [ISSUES.md](ISSUES.md) §11 — `client/src/components/ArgonLayout.jsx`. |
| B11 | **Chat message retry edge cases** | [ISSUES.md](ISSUES.md) §12 — `client/src/components/MessageBubble.jsx`. |
| B12 | **Mobile chat UX** | [ISSUES.md](ISSUES.md) §18 — `client/src/components/chat/`. |
| B13 | **Bundle / perf** | [ISSUES.md](ISSUES.md) §21–22 — verify lazy routes, heavy deps, slow Mongo queries under load. |

---

## C. Security and compliance (re-audit docs vs code)

| # | Item | Notes |
|---|------|--------|
| C1 | **Reconcile [SECURITY_VULNERABILITIES.md](SECURITY_VULNERABILITIES.md)** | Many entries describe **old** code (e.g. “rate limiting disabled”, permissive CORS, JWT fallback). Walk the report against **current** `server/index.js`, `server/middleware/auth.js`, `server/controllers/authController.js`, `server/utils/jwt.js`; close or rewrite each item. |
| C2 | **CORS for production** | Ensure production origins are explicit; non-prod `localhost` / `*.vercel.app` rules match your threat model (`server/index.js`). |
| C3 | **Input validation sweep** | [ISSUES.md](ISSUES.md) §19 — all write endpoints (rides, chat, SOS, uploads, friends). |
| C4 | **Session / token storage** | If still using `sessionStorage` for JWT, document XSS risk and mitigations (CSP, sanitization) — see prior audits. |
| C5 | **Helmet / CSP** | CSP is disabled in Helmet config (`server/index.js`); decide if you need a tightened policy for production. |

---

## D. Tests and quality gates

| # | Item | Location |
|---|------|----------|
| D1 | **Un-skip or rewrite skipped suites** | `server/tests/unit/controllers/rideController.test.js`, `server/tests/unit/controllers/chatController.test.js`, `server/tests/integration/rides.integration.test.js`, `client/src/tests/components/ArgonLayout.test.jsx`, `client/src/tests/components/RideOfferForm.test.jsx`, `client/src/tests/hooks/useChatData.test.js`. |
| D2 | **Update [ISSUES.md](ISSUES.md) §16** | It claims “no visible test files”; that is **false** now — refresh testing section to match [README-TESTS.md](README-TESTS.md). |
| D3 | **E2E / manual matrix** | Realtime (chat, notifications, SOS) still needs manual or Playwright coverage ([ISSUES.md](ISSUES.md) §17). |

---

## E. Documentation and process

| # | Item |
|---|------|
| E1 | **Refresh [ISSUES.md](ISSUES.md)** — statuses (e.g. gender filter fixed), line references, “debug button” if removed, last-updated date. |
| E2 | **Align [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md)** with chosen host (Vercel-only vs split API + sockets). |
| E3 | **Engineering standards** — [ISSUES.md](ISSUES.md) §13–15: optional error boundary, less duplication, TypeScript (long-term). |

---

## F. Optional “nice to have” (not blockers)

- Structured logging (pino) + log levels instead of `console.log`.
- Error boundaries in React ([ISSUES.md](ISSUES.md) recommendations).
- Monitoring (Sentry, Vercel Analytics, uptime checks).

---

## Suggested order of attack

1. **A1 + A3** (otherwise prod API/socket client misbehaves immediately).
2. **A2 + A4** (architecture: where sockets and cron live).
3. **C1** (know true security delta).
4. **B5, B3, B2** (API + auth consistency).
5. **D1** (stop flying blind on regressions).
6. Remaining **B** and **C** items by priority.

---

## Tracking todos (optional)

You can mirror these in your issue tracker:

- [ ] A1 — Fix `server/index.js` `module.exports` for Vercel (`app` only for serverless).
- [ ] A2 — Decide Socket.IO hosting (Vercel vs separate service vs Pusher/Ably).
- [ ] A3 — Env-driven Socket.IO CORS in `server/utils/socket.js`.
- [ ] A4 — Cron/worker for notification cleanup + auto-status on serverless.
- [ ] C1 — Re-audit `SECURITY_VULNERABILITIES.md` vs current code.
- [ ] B1–B13 — Work through ISSUES-backed product items.
- [ ] D1–D3 — Tests and ISSUES testing section refresh.
