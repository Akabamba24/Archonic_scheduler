# TradeFlow Scheduler

Full-stack MVP for a home-service booking and dispatch platform.

## Features

- Company-specific customer booking pages: `/book/:companySlug`
- Company-specific dispatch dashboards: `/dashboard/:companySlug`
- Configurable trades, service menus, service pricing, and crew rosters
- Customer request descriptions and photo previews
- Dispatch work orders with status, crew assignment, distance, payment, and print view
- Demo/live confirmation flow for SMS and email
- Express backend with local JSON persistence for companies and bookings

## Tech Stack

- React
- Vite
- Express
- Local JSON-backed API storage
- Twilio/SendGrid-ready confirmation backend

## Run Locally

```bash
npm install
npm run dev:full
```

Open:

- Demo hub: `http://127.0.0.1:5173/`
- Booking example: `http://127.0.0.1:5173/book/sunstate-hvac`
- Dashboard example: `http://127.0.0.1:5173/dashboard/bright-home-services`

## Environment

Copy `.env.example` to `.env` when you are ready to test live SMS/email.

Demo mode works without credentials.
