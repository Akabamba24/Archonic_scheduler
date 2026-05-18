import express from "express";
import cors from "cors";
import "dotenv/config";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const port = Number(process.env.PORT || 8787);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const storePath = path.join(__dirname, "data", "store.json");

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://127.0.0.1:5173" }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "tradeflow-api" });
});

app.get("/api/companies", async (_req, res) => {
  const store = await readStore();
  res.json({
    ok: true,
    companies: store.companies.map(({ id, name, slug, serviceArea, dispatchPhone }) => ({
      id,
      name,
      slug,
      serviceArea,
      dispatchPhone
    }))
  });
});

app.get("/api/companies/:slug", async (req, res) => {
  const store = await readStore();
  const company = findCompany(store, req.params.slug);
  if (!company) {
    return res.status(404).json({ ok: false, error: "Company not found." });
  }
  res.json({ ok: true, company });
});

app.patch("/api/companies/:slug", async (req, res) => {
  const store = await readStore();
  const company = findCompany(store, req.params.slug);
  if (!company) {
    return res.status(404).json({ ok: false, error: "Company not found." });
  }

  Object.assign(company, pickCompanyUpdates(req.body || {}));
  await writeStore(store);
  res.json({ ok: true, company });
});

app.post("/api/companies/:slug/bookings", async (req, res) => {
  const store = await readStore();
  const company = findCompany(store, req.params.slug);
  if (!company) {
    return res.status(404).json({ ok: false, error: "Company not found." });
  }

  const booking = {
    ...req.body,
    id: req.body?.id || nextBookingId(company),
    createdAt: new Date().toISOString()
  };
  company.bookings = [booking, ...(company.bookings || [])];
  await writeStore(store);
  res.status(201).json({ ok: true, booking, company });
});

app.patch("/api/companies/:slug/bookings/:id", async (req, res) => {
  const store = await readStore();
  const company = findCompany(store, req.params.slug);
  if (!company) {
    return res.status(404).json({ ok: false, error: "Company not found." });
  }

  const booking = (company.bookings || []).find((item) => item.id === req.params.id);
  if (!booking) {
    return res.status(404).json({ ok: false, error: "Booking not found." });
  }

  Object.assign(booking, req.body || {});
  await writeStore(store);
  res.json({ ok: true, booking, company });
});

app.post("/api/confirmations/send", async (req, res) => {
  const { booking, communications } = req.body || {};

  if (!booking || !communications) {
    return res.status(400).json({ ok: false, error: "Missing booking or communications payload." });
  }

  const mode = communications.mode === "Live" ? "Live" : "Demo";
  const message = buildConfirmationMessage(booking);

  if (mode === "Demo") {
    return res.json({
      ok: true,
      mode,
      status: "simulated",
      sent: {
        sms: Boolean(booking.phone),
        email: Boolean(booking.email)
      },
      message,
      providerIds: {
        sms: `demo-sms-${booking.id}`,
        email: `demo-email-${booking.id}`
      }
    });
  }

  const missing = getMissingLiveConfig();
  if (missing.length) {
    return res.status(422).json({
      ok: false,
      mode,
      error: "Live delivery needs backend provider credentials.",
      missing
    });
  }

  try {
    const [smsResult, emailResult] = await Promise.all([
      sendSms({
        to: booking.phone,
        body: message
      }),
      sendEmail({
        to: booking.email,
        subject: `Confirmed: ${booking.service} ${booking.window}`,
        text: message
      })
    ]);

    res.json({
      ok: true,
      mode,
      status: "sent",
      providerIds: {
        sms: smsResult.id,
        email: emailResult.id
      }
    });
  } catch (error) {
    res.status(502).json({
      ok: false,
      mode,
      error: error.message || "Provider delivery failed."
    });
  }
});

function buildConfirmationMessage(booking) {
  return [
    `Hi ${booking.name}, your ${booking.service} appointment is confirmed.`,
    `Window: ${booking.window}.`,
    `Crew: ${booking.crew}.`,
    `Estimated price: ${booking.price === 0 ? "Free quote" : `$${booking.price}`}.`
  ].join(" ");
}

function getMissingLiveConfig() {
  const required = [
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
    "TWILIO_FROM_PHONE",
    "SENDGRID_API_KEY",
    "SENDGRID_FROM_EMAIL"
  ];
  return required.filter((key) => !process.env[key]);
}

async function sendSms({ to, body }) {
  if (!to) return { id: "skipped-no-phone" };

  const auth = Buffer.from(
    `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
  ).toString("base64");

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        To: to,
        From: process.env.TWILIO_FROM_PHONE,
        Body: body
      })
    }
  );

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Twilio SMS failed.");
  }
  return { id: data.sid };
}

async function sendEmail({ to, subject, text }) {
  if (!to) return { id: "skipped-no-email" };

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: process.env.SENDGRID_FROM_EMAIL },
      subject,
      content: [{ type: "text/plain", value: text }]
    })
  });

  if (!response.ok) {
    const textBody = await response.text();
    throw new Error(textBody || "SendGrid email failed.");
  }

  return { id: response.headers.get("x-message-id") || "sendgrid-accepted" };
}

app.listen(port, () => {
  console.log(`TradeFlow API listening on http://127.0.0.1:${port}`);
});

async function readStore() {
  try {
    const raw = await readFile(storePath, "utf8");
    return JSON.parse(raw);
  } catch {
    const seeded = seedStore();
    await writeStore(seeded);
    return seeded;
  }
}

async function writeStore(store) {
  await mkdir(path.dirname(storePath), { recursive: true });
  await writeFile(storePath, JSON.stringify(store, null, 2));
}

function findCompany(store, slugOrId) {
  return store.companies.find((company) => company.slug === slugOrId || company.id === slugOrId);
}

function pickCompanyUpdates(body) {
  const allowed = [
    "name",
    "slug",
    "preset",
    "enabledTrades",
    "serviceArea",
    "dispatchPhone",
    "serviceCatalog",
    "crews",
    "bookings"
  ];
  return Object.fromEntries(Object.entries(body).filter(([key]) => allowed.includes(key)));
}

function nextBookingId(company) {
  const numbers = (company.bookings || [])
    .map((booking) => Number(String(booking.id || "").replace(/\D/g, "")))
    .filter(Boolean);
  return `TF-${Math.max(1050, ...numbers) + 1}`;
}

function seedStore() {
  const serviceCatalog = {
    HVAC: {
      color: "#166b5f",
      items: [
        { name: "AC diagnostic", base: 95, hours: 2, urgency: 1 },
        { name: "No heat / furnace issue", base: 135, hours: 3, urgency: 1 },
        { name: "Tune-up and filter check", base: 149, hours: 2, urgency: 2 },
        { name: "Mini-split quote visit", base: 79, hours: 2, urgency: 4 }
      ]
    },
    Electrical: {
      color: "#8b5f13",
      items: [
        { name: "Outlet or switch repair", base: 155, hours: 2, urgency: 2 },
        { name: "Panel safety inspection", base: 199, hours: 3, urgency: 3 },
        { name: "EV charger estimate", base: 99, hours: 2, urgency: 5 },
        { name: "Breaker keeps tripping", base: 185, hours: 3, urgency: 1 }
      ]
    },
    Roofing: {
      color: "#6f4d35",
      items: [
        { name: "Leak inspection", base: 145, hours: 2, urgency: 1 },
        { name: "Storm damage assessment", base: 175, hours: 3, urgency: 2 },
        { name: "Shingle repair", base: 325, hours: 4, urgency: 3 },
        { name: "Full roof replacement quote", base: 0, hours: 2, urgency: 6 }
      ]
    }
  };

  const bookings = [
    {
      id: "TF-1048",
      name: "Maya Collins",
      trade: "HVAC",
      service: "AC diagnostic",
      window: "Today 2:00-4:00 PM",
      price: 114,
      paid: "Deposit paid",
      distance: 4.8,
      crew: "North crew",
      lead: "Alex M.",
      address: "118 Pinecrest Dr",
      phone: "(407) 555-0142",
      email: "maya@example.com",
      notes: "AC running but not cooling. Customer uploaded thermostat photo.",
      contact: "SMS + email queued",
      status: "Confirmed",
      priority: "Normal"
    },
    {
      id: "TF-1049",
      name: "Dev Patel",
      trade: "Roofing",
      service: "Leak inspection",
      window: "Today 4:30-6:30 PM",
      price: 150,
      paid: "Card hold",
      distance: 5.6,
      crew: "Roof scout",
      lead: "Nina K.",
      address: "22 Palmetto Ridge",
      phone: "(407) 555-0168",
      email: "dev@example.com",
      notes: "Water stain in guest bedroom after heavy rain.",
      contact: "Reminder in 1 hour",
      status: "Needs photos",
      priority: "High"
    },
    {
      id: "TF-1050",
      name: "Rosa Allen",
      trade: "Electrical",
      service: "Breaker keeps tripping",
      window: "Tomorrow 9:00-11:00 AM",
      price: 194,
      paid: "Invoice on completion",
      distance: 8.1,
      crew: "Panel crew",
      lead: "Sam R.",
      address: "730 Orange Blossom Ln",
      phone: "(407) 555-0119",
      email: "rosa@example.com",
      notes: "Breaker trips when microwave and dishwasher run together.",
      contact: "SMS confirmed",
      status: "Confirmed",
      priority: "Urgent"
    }
  ];

  return {
    companies: [
      {
        id: "sunstate-hvac",
        name: "Sunstate HVAC",
        slug: "sunstate-hvac",
        preset: "HVAC company",
        enabledTrades: ["HVAC"],
        serviceArea: "Orlando metro",
        dispatchPhone: "(407) 555-0100",
        serviceCatalog,
        crews: [
          { name: "Sunstate Van 1", lead: "Alex M.", trade: "HVAC", distance: 4.1, open: "Today 1:00-3:00 PM", capacity: "2 jobs open" },
          { name: "Sunstate Van 2", lead: "Chris T.", trade: "HVAC", distance: 9.3, open: "Tomorrow 9:00-11:00 AM", capacity: "1 job open" }
        ],
        bookings: bookings.filter((booking) => booking.trade === "HVAC")
      },
      {
        id: "ridgecap-roofing",
        name: "RidgeCap Roofing",
        slug: "ridgecap-roofing",
        preset: "Roofing company",
        enabledTrades: ["Roofing"],
        serviceArea: "Central Florida",
        dispatchPhone: "(407) 555-0125",
        serviceCatalog,
        crews: [
          { name: "Inspection truck", lead: "Nina K.", trade: "Roofing", distance: 5.6, open: "Today 4:30-6:30 PM", capacity: "3 inspections open" },
          { name: "Repair crew", lead: "Owen P.", trade: "Roofing", distance: 11.2, open: "Tomorrow 8:00-10:00 AM", capacity: "1 repair open" }
        ],
        bookings: bookings.filter((booking) => booking.trade === "Roofing")
      },
      {
        id: "bright-home-services",
        name: "Bright Home Services",
        slug: "bright-home-services",
        preset: "Home services group",
        enabledTrades: ["HVAC", "Electrical", "Roofing"],
        serviceArea: "Orange and Seminole counties",
        dispatchPhone: "(407) 555-0160",
        serviceCatalog,
        crews: [
          { name: "North crew", lead: "Alex M.", trade: "HVAC", distance: 4.8, open: "Today 2:00-4:00 PM", capacity: "2 jobs open" },
          { name: "Panel crew", lead: "Sam R.", trade: "Electrical", distance: 8.1, open: "Tomorrow 9:00-11:00 AM", capacity: "1 job open" },
          { name: "Roof scout", lead: "Nina K.", trade: "Roofing", distance: 5.6, open: "Today 4:30-6:30 PM", capacity: "3 inspections open" },
          { name: "South service van", lead: "Chris T.", trade: "HVAC", distance: 12.4, open: "Tomorrow 12:00-2:00 PM", capacity: "1 job open" }
        ],
        bookings
      }
    ]
  };
}
