# Production Readiness Plan

This project is now past a demo-only frontend. It has a React app, Express API, local persistence, company routes, booking routes, dashboard routes, and confirmation delivery scaffolding.

## Already In Place

- Company-specific booking routes: `/book/:companySlug`
- Company-specific dashboard routes: `/dashboard/:companySlug`
- Express API for companies and bookings
- Local JSON-backed persistence for demo and development
- Request validation for company and booking updates
- CORS allowlist
- Security headers through Helmet
- API rate limiting
- Body size limits
- Production static serving from the Express app
- Demo/live confirmation delivery path
- Twilio SMS and SendGrid email integration scaffolding

## Required Before Real Production

These require business or infrastructure decisions.

1. **Managed database**
   Replace `server/data/store.json` with Postgres through Supabase, Neon, Railway, Render, or another managed provider.

2. **Authentication**
   Add dashboard login for company users. Customer booking pages can remain public.

3. **Authorization**
   Ensure a company user can only access their own dashboard, services, crews, bookings, and messages.

4. **Persistent photo storage**
   Move customer photos to object storage such as Supabase Storage, S3, Cloudflare R2, or UploadThing.

5. **Live SMS and email**
   Add real Twilio and SendGrid credentials. Configure SMS compliance for U.S. business texting before sending real customer texts.

6. **Payments**
   Add Stripe only when the product needs deposits, card holds, or invoices.

7. **Deployment**
   Use a real production host. Simple path:
   - Vercel or Netlify for frontend-only deployments
   - Render, Railway, Fly.io, or a VPS for the Express API
   - Or serve both from Express with `npm run build` and `npm start`

8. **Observability**
   Add structured logs, uptime checks, error reporting, and basic analytics.

9. **Backups**
   Database backups and restore tests are mandatory before production customers.

## Suggested Next Build Order

1. Replace JSON store with Postgres.
2. Add company login and protected dashboard routes.
3. Add persistent photo uploads.
4. Add production deployment config.
5. Connect live email first.
6. Connect live SMS after compliance is ready.
7. Add AI assistant features behind feature flags.

## Where You Need To Step In

- Pick hosting/database provider.
- Create provider accounts.
- Provide API keys through `.env`.
- Decide whether the first real customer is HVAC, roofing, electrical, or multi-trade.
- Provide real company name, logo, services, prices, service area, and crew names.
