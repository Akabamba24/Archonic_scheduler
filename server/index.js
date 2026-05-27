import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import "dotenv/config";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const port = Number(process.env.PORT || 8787);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, "..");
const dataDir = process.env.DATA_DIR
  ? path.resolve(projectRoot, process.env.DATA_DIR)
  : path.join(__dirname, "data");
const storePath = path.join(dataDir, "store.json");
const distPath = path.join(projectRoot, "dist");
const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.CLIENT_ORIGIN || "http://127.0.0.1:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Origin is not allowed by CORS."));
    }
  })
);
app.use(
  rateLimit({
    windowMs: Number(process.env.API_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
    max: Number(process.env.API_RATE_LIMIT_MAX || 300),
    standardHeaders: true,
    legacyHeaders: false
  })
);
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "tradeflow-api" });
});

app.get("/api/companies", asyncHandler(async (_req, res) => {
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
}));

app.get("/api/companies/:slug", asyncHandler(async (req, res) => {
  const store = await readStore();
  const company = findCompany(store, req.params.slug);
  if (!company) {
    return res.status(404).json({ ok: false, error: "Company not found." });
  }
  res.json({ ok: true, company });
}));

app.patch("/api/companies/:slug", asyncHandler(async (req, res) => {
  const store = await readStore();
  const company = findCompany(store, req.params.slug);
  if (!company) {
    return res.status(404).json({ ok: false, error: "Company not found." });
  }

  const updates = validateCompanyUpdates(req.body || {});
  Object.assign(company, updates);
  await writeStore(store);
  res.json({ ok: true, company });
}));

app.post("/api/companies/:slug/bookings", asyncHandler(async (req, res) => {
  const store = await readStore();
  const company = findCompany(store, req.params.slug);
  if (!company) {
    return res.status(404).json({ ok: false, error: "Company not found." });
  }

  const booking = {
    ...validateBooking(req.body || {}),
    id: nextBookingId(company),
    createdAt: new Date().toISOString()
  };
  company.bookings = [booking, ...(company.bookings || [])];
  await writeStore(store);
  res.status(201).json({ ok: true, booking, company });
}));

app.patch("/api/companies/:slug/bookings/:id", asyncHandler(async (req, res) => {
  const store = await readStore();
  const company = findCompany(store, req.params.slug);
  if (!company) {
    return res.status(404).json({ ok: false, error: "Company not found." });
  }

  const booking = (company.bookings || []).find((item) => item.id === req.params.id);
  if (!booking) {
    return res.status(404).json({ ok: false, error: "Booking not found." });
  }

  Object.assign(booking, validateBookingUpdate(req.body || {}));
  await writeStore(store);
  res.json({ ok: true, booking, company });
}));

app.post("/api/ai/classify-request", asyncHandler(async (req, res) => {
  const store = await readStore();
  const company = findCompany(store, req.body?.companySlug || req.params.slug);
  if (!company) {
    return res.status(404).json({ ok: false, error: "Company not found." });
  }

  const payload = validateClassificationRequest(req.body || {});
  const suggestion = process.env.OPENAI_API_KEY
    ? await classifyWithOpenAI(company, payload)
    : classifyWithDemoRules(company, payload);

  res.json({
    ok: true,
    mode: process.env.OPENAI_API_KEY ? "OpenAI" : "Demo rules",
    suggestion
  });
}));

app.post("/api/confirmations/send", asyncHandler(async (req, res) => {
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
}));

function buildConfirmationMessage(booking) {
  return [
    `Hi ${booking.name}, your ${booking.service} appointment is confirmed.`,
    `Window: ${booking.window}.`,
    `Crew: ${booking.crew}.`,
    `Estimated price: ${booking.price === 0 ? "Free quote" : `$${booking.price}`}.`
  ].join(" ");
}

function validateClassificationRequest(body) {
  return {
    companySlug: cleanText(body.companySlug || "", "Company slug", 80),
    description: cleanText(body.description || "", "Description", 1200),
    selectedTrade: cleanText(body.selectedTrade || "", "Selected trade", 60, false),
    selectedService: cleanText(body.selectedService || "", "Selected service", 100, false),
    photos: Array.isArray(body.photos)
      ? body.photos.slice(0, 8).map((photo) => ({
          name: cleanText(photo?.name || "Uploaded photo", "Photo name", 120, false)
        }))
      : []
  };
}

function classifyWithDemoRules(company, payload) {
  const text = `${payload.description} ${payload.selectedTrade} ${payload.selectedService}`.toLowerCase();
  const tradeScores = {
    HVAC: scoreText(text, ["ac", "air", "cool", "heat", "furnace", "thermostat", "unit", "vent", "compressor"]),
    Electrical: scoreText(text, ["breaker", "outlet", "switch", "light", "buzz", "spark", "panel", "power", "electric"]),
    Roofing: scoreText(text, ["roof", "leak", "shingle", "storm", "water", "ceiling", "drip", "gutter", "rain"])
  };
  const enabled = company.enabledTrades?.length ? company.enabledTrades : Object.keys(tradeScores);
  const suggestedTrade = enabled
    .map((trade) => ({ trade, score: tradeScores[trade] || 0 }))
    .sort((a, b) => b.score - a.score)[0]?.trade || "Needs classification";
  const suggestedService = chooseService(company, suggestedTrade, text);
  const urgency = inferUrgency(text);
  const confidence = Math.min(0.92, Math.max(0.48, (tradeScores[suggestedTrade] || 1) / 6 + 0.45));

  return {
    suggestedTrade,
    suggestedService,
    urgency,
    confidence: Number(confidence.toFixed(2)),
    dispatcherNotes: buildDispatcherNotes(suggestedTrade, suggestedService, urgency, payload),
    followUpQuestions: buildFollowUpQuestions(suggestedTrade, text),
    source: "demo-rules"
  };
}

async function classifyWithOpenAI(company, payload) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      input: [
        {
          role: "system",
          content:
            "Classify home-service requests for a dispatcher. Suggest, do not diagnose. Use only services the company offers when possible."
        },
        {
          role: "user",
          content: JSON.stringify({
            company: {
              name: company.name,
              enabledTrades: company.enabledTrades,
              services: summarizeServices(company.serviceCatalog)
            },
            request: payload
          })
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "service_request_classification",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              suggestedTrade: { type: "string" },
              suggestedService: { type: "string" },
              urgency: { type: "string", enum: ["Low", "Normal", "High", "Urgent"] },
              confidence: { type: "number" },
              dispatcherNotes: { type: "string" },
              followUpQuestions: { type: "array", items: { type: "string" } },
              source: { type: "string" }
            },
            required: [
              "suggestedTrade",
              "suggestedService",
              "urgency",
              "confidence",
              "dispatcherNotes",
              "followUpQuestions",
              "source"
            ]
          }
        }
      }
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw badRequest(data.error?.message || "AI classification failed.");
  }
  const text = data.output_text || data.output?.flatMap((item) => item.content || []).find((item) => item.text)?.text;
  if (!text) throw badRequest("AI classification returned no text.");
  return { ...JSON.parse(text), source: "openai" };
}

function scoreText(text, words) {
  return words.reduce((score, word) => score + (text.includes(word) ? 1 : 0), 0);
}

function chooseService(company, trade, text) {
  const services = company.serviceCatalog?.[trade]?.items || [];
  if (!services.length) return "Customer-described request";
  const scored = services.map((service) => ({
    name: service.name,
    score: service.name.toLowerCase().split(/\W+/).filter((word) => word && text.includes(word)).length
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.score ? scored[0].name : services[0].name;
}

function inferUrgency(text) {
  if (/(spark|smoke|burn|fire|active leak|flood|no heat|no cooling|danger)/.test(text)) return "Urgent";
  if (/(leak|drip|breaker|tripping|storm|not cooling|not working)/.test(text)) return "High";
  if (/(quote|estimate|inspection|tune)/.test(text)) return "Normal";
  return "Normal";
}

function buildDispatcherNotes(trade, service, urgency, payload) {
  const photoNote = payload.photos.length ? ` Customer uploaded ${payload.photos.length} photo(s).` : "";
  return `AI suggests ${trade} / ${service} with ${urgency.toLowerCase()} urgency. Review before dispatch.${photoNote}`;
}

function buildFollowUpQuestions(trade, text) {
  if (trade === "Roofing") {
    return ["Is water actively dripping right now?", "Can you upload a photo of the ceiling stain or roof area?"];
  }
  if (trade === "Electrical") {
    return ["Do you smell burning or see sparks?", "Which breaker, outlet, or room is affected?"];
  }
  if (trade === "HVAC") {
    return ["Is the system turning on at all?", "What temperature is showing on the thermostat?"];
  }
  return ["When did the issue start?", "Can you add a photo or short video?"];
}

function summarizeServices(catalog) {
  return Object.fromEntries(
    Object.entries(catalog || {}).map(([trade, config]) => [
      trade,
      (config.items || []).map((item) => item.name)
    ])
  );
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

app.use(express.static(distPath));
app.use((req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  return res.sendFile(path.join(distPath, "index.html"));
});

app.use((error, _req, res, _next) => {
  const status = error.status || 500;
  res.status(status).json({
    ok: false,
    error: status === 500 ? "Unexpected server error." : error.message
  });
});

app.listen(port, () => {
  console.log(`TradeFlow API listening on http://127.0.0.1:${port}`);
});

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

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

function validateCompanyUpdates(body) {
  const updates = pickCompanyUpdates(body);
  if (updates.slug && !/^[a-z0-9-]{3,60}$/.test(updates.slug)) {
    throw badRequest("Company slug must be 3-60 lowercase letters, numbers, or dashes.");
  }
  if (updates.name !== undefined) updates.name = cleanText(updates.name, "Company name", 80);
  if (updates.serviceArea !== undefined) updates.serviceArea = cleanText(updates.serviceArea, "Service area", 120);
  if (updates.dispatchPhone !== undefined) updates.dispatchPhone = cleanText(updates.dispatchPhone, "Dispatch phone", 40);
  if (updates.enabledTrades !== undefined && !Array.isArray(updates.enabledTrades)) {
    throw badRequest("Enabled trades must be an array.");
  }
  if (updates.crews !== undefined && !Array.isArray(updates.crews)) {
    throw badRequest("Crews must be an array.");
  }
  if (updates.bookings !== undefined && !Array.isArray(updates.bookings)) {
    throw badRequest("Bookings must be an array.");
  }
  if (updates.serviceCatalog !== undefined && typeof updates.serviceCatalog !== "object") {
    throw badRequest("Service catalog must be an object.");
  }
  return updates;
}

function validateBooking(body) {
  const booking = {
    name: cleanText(body.name || "New customer", "Customer name", 80),
    trade: cleanText(body.trade || "Needs classification", "Trade", 60),
    service: cleanText(body.service || "Customer-described request", "Service", 100),
    window: cleanText(body.window || "Company will confirm", "Window", 80),
    price: cleanNumber(body.price, "Price"),
    paid: cleanText(body.paid || "No payment due", "Payment status", 80),
    distance: cleanNumber(body.distance, "Distance"),
    crew: cleanText(body.crew || "Dispatcher review", "Crew", 80),
    lead: cleanText(body.lead || "Office team", "Lead", 80),
    address: cleanText(body.address || "", "Address", 160, false),
    phone: cleanText(body.phone || "", "Phone", 40, false),
    email: cleanEmail(body.email || ""),
    photos: Array.isArray(body.photos) ? body.photos.slice(0, 8) : [],
    aiSuggestion: body.aiSuggestion && typeof body.aiSuggestion === "object" ? body.aiSuggestion : null,
    notes: cleanText(body.notes || "", "Notes", 1000, false),
    contact: cleanText(body.contact || "SMS + email queued", "Contact status", 80),
    status: cleanStatus(body.status || "New"),
    priority: cleanText(body.priority || "Normal", "Priority", 40)
  };

  if (!booking.phone && !booking.email) {
    throw badRequest("A phone number or email is required.");
  }
  if (!booking.notes && booking.trade === "Needs classification") {
    throw badRequest("A description is required when no trade is selected.");
  }
  return booking;
}

function validateBookingUpdate(body) {
  const allowed = [
    "name",
    "trade",
    "service",
    "window",
    "price",
    "paid",
    "distance",
    "crew",
    "lead",
    "address",
    "phone",
    "email",
    "photos",
    "aiSuggestion",
    "notes",
    "contact",
    "status",
    "priority"
  ];
  const updates = Object.fromEntries(Object.entries(body).filter(([key]) => allowed.includes(key)));
  if (updates.status !== undefined) updates.status = cleanStatus(updates.status);
  if (updates.email !== undefined) updates.email = cleanEmail(updates.email);
  if (updates.price !== undefined) updates.price = cleanNumber(updates.price, "Price");
  if (updates.distance !== undefined) updates.distance = cleanNumber(updates.distance, "Distance");
  for (const key of ["name", "trade", "service", "window", "paid", "crew", "lead", "address", "phone", "notes", "contact", "priority"]) {
    if (updates[key] !== undefined) updates[key] = cleanText(updates[key], key, key === "notes" ? 1000 : 160, false);
  }
  if (updates.photos !== undefined && !Array.isArray(updates.photos)) {
    throw badRequest("Photos must be an array.");
  }
  return updates;
}

function cleanText(value, label, maxLength, required = true) {
  const text = String(value ?? "").trim();
  if (required && !text) throw badRequest(`${label} is required.`);
  if (text.length > maxLength) throw badRequest(`${label} must be ${maxLength} characters or fewer.`);
  return text;
}

function cleanEmail(value) {
  const email = String(value || "").trim();
  if (!email) return "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw badRequest("Email address is invalid.");
  return email;
}

function cleanNumber(value, label) {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number < 0) throw badRequest(`${label} must be a positive number.`);
  return number;
}

function cleanStatus(status) {
  const allowed = ["New", "Confirmed", "Needs photos", "Dispatched", "Completed"];
  if (!allowed.includes(status)) throw badRequest("Booking status is invalid.");
  return status;
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
