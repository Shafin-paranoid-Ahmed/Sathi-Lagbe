## Security Vulnerability Assessment (Updated)

This report supersedes older findings that referenced pre-hardening code paths.

### Last audit pass
- Date: 2026-04-18
- Scope: `server/index.js`, auth middleware/controllers, socket setup, upload handling, tests and deployment docs.

---

## Closed / mitigated since previous report

1. **Rate limiting disabled**
   - **Status:** Mitigated
   - **Evidence:** `server/index.js` applies both general `/api` and stricter `/api/auth` rate limits.

2. **JWT secret fallback**
   - **Status:** Mitigated
   - **Evidence:** `server/utils/jwt.js` requires `JWT_SECRET` with minimum length; auth and middleware use this helper.

3. **Debug endpoints exposed in routes**
   - **Status:** Mitigated
   - **Evidence:** legacy debug routes in `server/routes/userRoutes.js` and `server/routes/rideRoutes.js` were removed.

4. **Ride offer IDOR via body `riderId`**
   - **Status:** Mitigated
   - **Evidence:** `createRideOffer` and `createRecurringRides` derive rider from authenticated `req.user`.

---

## Active / remaining security risks

### High

1. **Socket.IO in serverless environments**
   - `server/index.js` now defaults sockets off in Vercel serverless unless explicitly enabled.
   - Risk remains if deployment enables sockets on ephemeral runtimes.
   - **Action:** run sockets on a long-lived host or managed realtime service.

2. **Session token stored in `sessionStorage`**
   - XSS can still expose bearer tokens.
   - **Action:** move to HttpOnly secure cookies where feasible, or enforce strict CSP and sanitization.

3. **CORS allowlist governance**
   - Current CORS is stricter than before but still allows no-origin requests.
   - **Action:** confirm this is intentional for curl/mobile; tighten if web-only.

### Medium

4. **Debug logging still present in some controllers/services**
   - Console logs may leak operational details.
   - **Action:** replace with structured logger and sanitize payloads.

5. **File upload abuse surface**
   - Upload route now has MIME/type + size limits, but no malware scanning.
   - **Action:** add async scanning or trusted media processing pipeline.

6. **Inconsistent response envelopes**
   - Some endpoints return `{ error }` only; others include `{ success, error, message }`.
   - **Action:** standardize response contract to reduce security footguns and client branching.

### Low

7. **CSP disabled in helmet config**
   - `contentSecurityPolicy: false` weakens defense-in-depth.
   - **Action:** enable CSP with an allowlist tuned for frontend assets and APIs.

---

## Deployment-focused security checklist

- [ ] Set `JWT_SECRET`, `MONGO_URI`, `CRON_SECRET`, cloud keys, Redis URL as host secrets (never committed).
- [ ] Restrict DB/Redis network access to app origin ranges where possible.
- [ ] If using Vercel Cron, protect internal cron routes with `CRON_SECRET`.
- [ ] Verify production CORS origins and socket CORS origins are explicit.
- [ ] Run dependency audit and patch critical advisories before release.

---

## Notes

- This document now tracks current-state risks and intentionally removes outdated “critical” claims tied to already-fixed code.
- Keep this file synchronized with `doc/ISSUES.md` and deployment architecture decisions.
