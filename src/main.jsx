import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Bell,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  DollarSign,
  FileText,
  Home,
  Mail,
  MapPin,
  MessageSquareText,
  Navigation,
  Phone,
  Plus,
  Printer,
  Route,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Sliders,
  SlidersHorizontal,
  Trash2,
  Truck,
  UserRound,
  Wrench,
  Zap
} from "lucide-react";
import "./styles.css";

const services = {
  HVAC: {
    icon: Wrench,
    color: "#166b5f",
    items: [
      { name: "AC diagnostic", base: 89, hours: 2, urgency: 1 },
      { name: "No heat / furnace issue", base: 119, hours: 3, urgency: 1 },
      { name: "Tune-up and filter check", base: 129, hours: 2, urgency: 2 },
      { name: "Mini-split quote visit", base: 79, hours: 2, urgency: 4 }
    ]
  },
  Electrical: {
    icon: Zap,
    color: "#8b5f13",
    items: [
      { name: "Outlet or switch repair", base: 145, hours: 2, urgency: 2 },
      { name: "Panel safety inspection", base: 199, hours: 3, urgency: 3 },
      { name: "EV charger estimate", base: 99, hours: 2, urgency: 5 },
      { name: "Breaker keeps tripping", base: 169, hours: 3, urgency: 1 }
    ]
  },
  Roofing: {
    icon: Home,
    color: "#6f4d35",
    items: [
      { name: "Leak inspection", base: 125, hours: 2, urgency: 1 },
      { name: "Storm damage assessment", base: 149, hours: 3, urgency: 2 },
      { name: "Shingle repair", base: 275, hours: 4, urgency: 3 },
      { name: "Full roof replacement quote", base: 0, hours: 2, urgency: 6 }
    ]
  }
};

function makeServiceCatalog(overrides = {}) {
  return Object.fromEntries(
    Object.entries(services).map(([tradeName, config]) => [
      tradeName,
      {
        ...config,
        items: config.items.map((item) => ({
          ...item,
          base: overrides[tradeName]?.[item.name] ?? item.base
        }))
      }
    ])
  );
}

const companyPresets = {
  "HVAC company": ["HVAC"],
  "Electrical company": ["Electrical"],
  "Roofing company": ["Roofing"],
  "Home services group": ["HVAC", "Electrical", "Roofing"],
  "Custom setup": ["HVAC", "Electrical"]
};

const otherService = { name: "Other", base: 0, hours: 2, urgency: 3 };

const addOns = [
  { label: "Same-day priority", price: 85 },
  { label: "After-hours window", price: 120 },
  { label: "Photo/video review before arrival", price: 25 }
];

const defaultCrews = [
  { name: "North crew", lead: "Alex M.", trade: "HVAC", distance: 4.8, open: "Today 2:00-4:00 PM", capacity: "2 jobs open" },
  { name: "Panel crew", lead: "Sam R.", trade: "Electrical", distance: 8.1, open: "Tomorrow 9:00-11:00 AM", capacity: "1 job open" },
  { name: "Roof scout", lead: "Nina K.", trade: "Roofing", distance: 5.6, open: "Today 4:30-6:30 PM", capacity: "3 inspections open" },
  { name: "South service van", lead: "Chris T.", trade: "HVAC", distance: 12.4, open: "Tomorrow 12:00-2:00 PM", capacity: "1 job open" }
];

const initialBookings = [
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

const demoCustomers = [
  {
    label: "AC not cooling",
    customer: {
      name: "Jordan Rivera",
      phone: "(407) 555-0184",
      email: "jordan@example.com",
      address: "410 Lakeview Ave"
    },
    trade: "HVAC",
    service: "AC diagnostic",
    description: "The AC has been running all afternoon but the house is still warm."
  },
  {
    label: "Roof leak",
    customer: {
      name: "Tanya Brooks",
      phone: "(407) 555-0192",
      email: "tanya@example.com",
      address: "88 Cypress Bend"
    },
    trade: "Roofing",
    service: "Leak inspection",
    description: "Water is dripping near the hallway light after last night's rain."
  },
  {
    label: "Describe only",
    customer: {
      name: "Marcus Green",
      phone: "(407) 555-0108",
      email: "marcus@example.com",
      address: "312 Gardenia St"
    },
    trade: "",
    service: "Other",
    description: "Something is buzzing near the outside unit and I am not sure who should handle it."
  }
];

const demoCompanyProfiles = [
  {
    id: "sunstate-hvac",
    name: "Sunstate HVAC",
    slug: "sunstate-hvac",
    preset: "HVAC company",
    enabledTrades: ["HVAC"],
    serviceArea: "Orlando metro",
    dispatchPhone: "(407) 555-0100",
    serviceCatalog: makeServiceCatalog({
      HVAC: {
        "AC diagnostic": 95,
        "No heat / furnace issue": 135,
        "Tune-up and filter check": 149
      }
    }),
    crews: [
      { name: "Sunstate Van 1", lead: "Alex M.", trade: "HVAC", distance: 4.1, open: "Today 1:00-3:00 PM", capacity: "2 jobs open" },
      { name: "Sunstate Van 2", lead: "Chris T.", trade: "HVAC", distance: 9.3, open: "Tomorrow 9:00-11:00 AM", capacity: "1 job open" }
    ],
    bookings: initialBookings.filter((booking) => booking.trade === "HVAC")
  },
  {
    id: "ridgecap-roofing",
    name: "RidgeCap Roofing",
    slug: "ridgecap-roofing",
    preset: "Roofing company",
    enabledTrades: ["Roofing"],
    serviceArea: "Central Florida",
    dispatchPhone: "(407) 555-0125",
    serviceCatalog: makeServiceCatalog({
      Roofing: {
        "Leak inspection": 145,
        "Storm damage assessment": 175,
        "Shingle repair": 325
      }
    }),
    crews: [
      { name: "Inspection truck", lead: "Nina K.", trade: "Roofing", distance: 5.6, open: "Today 4:30-6:30 PM", capacity: "3 inspections open" },
      { name: "Repair crew", lead: "Owen P.", trade: "Roofing", distance: 11.2, open: "Tomorrow 8:00-10:00 AM", capacity: "1 repair open" }
    ],
    bookings: initialBookings.filter((booking) => booking.trade === "Roofing")
  },
  {
    id: "bright-home-services",
    name: "Bright Home Services",
    slug: "bright-home-services",
    preset: "Home services group",
    enabledTrades: ["HVAC", "Electrical", "Roofing"],
    serviceArea: "Orange and Seminole counties",
    dispatchPhone: "(407) 555-0160",
    serviceCatalog: makeServiceCatalog({
      HVAC: { "AC diagnostic": 109 },
      Electrical: { "Outlet or switch repair": 155, "Breaker keeps tripping": 185 },
      Roofing: { "Leak inspection": 139 }
    }),
    crews: defaultCrews,
    bookings: initialBookings
  }
];

function money(value) {
  return value === 0 ? "Free quote" : `$${value.toLocaleString()}`;
}

function App() {
  const initialRoute = parseRoute(window.location.pathname);
  const initialCompany =
    demoCompanyProfiles.find((company) => company.slug === initialRoute.slug) || demoCompanyProfiles[0];
  const [companyProfiles, setCompanyProfiles] = useState(demoCompanyProfiles);
  const [activeCompanyId, setActiveCompanyId] = useState(initialCompany.id);
  const activeCompany = companyProfiles.find((company) => company.id === activeCompanyId) || initialCompany;
  const [currentRoute, setCurrentRoute] = useState(initialRoute);
  const [serviceCatalog, setServiceCatalog] = useState(activeCompany.serviceCatalog);
  const [crews, setCrews] = useState(activeCompany.crews);
  const [preset, setPreset] = useState(activeCompany.preset);
  const [enabledTrades, setEnabledTrades] = useState(activeCompany.enabledTrades);
  const [trade, setTrade] = useState("");
  const [serviceName, setServiceName] = useState(services.HVAC.items[0].name);
  const [customServiceDescription, setCustomServiceDescription] = useState("");
  const [newService, setNewService] = useState({ trade: "HVAC", name: "", base: "99" });
  const [newCrew, setNewCrew] = useState({
    name: "",
    lead: "",
    trade: "HVAC",
    distance: "6",
    open: "Tomorrow 10:00 AM-12:00 PM",
    capacity: "1 job open"
  });
  const [communications, setCommunications] = useState({
    mode: "Demo",
    smsProvider: "Twilio",
    emailProvider: "SendGrid",
    fromPhone: "+1 (407) 555-0100",
    fromEmail: "dispatch@tradeflow.demo"
  });
  const [zip, setZip] = useState("32801");
  const [selectedAddOns, setSelectedAddOns] = useState(["Photo/video review before arrival"]);
  const [uploadedPhotos, setUploadedPhotos] = useState([]);
  const [bookings, setBookings] = useState(activeCompany.bookings);
  const [selectedBookingId, setSelectedBookingId] = useState(activeCompany.bookings[0]?.id || "");
  const [deliveryStatus, setDeliveryStatus] = useState("");
  const [persistenceStatus, setPersistenceStatus] = useState("Local API storage ready");
  const [openHeaderPanel, setOpenHeaderPanel] = useState("");
  const [customer, setCustomer] = useState({
    name: "Jordan Rivera",
    phone: "(407) 555-0184",
    email: "jordan@example.com",
    address: "410 Lakeview Ave"
  });

  useEffect(() => {
    loadCompanyFromApi(initialCompany.slug);
  }, []);

  useEffect(() => {
    const onPopState = () => {
      const nextRoute = parseRoute(window.location.pathname);
      setCurrentRoute(nextRoute);
      const routeCompany = companyProfiles.find((company) => company.slug === nextRoute.slug);
      if (routeCompany) {
        switchCompany(routeCompany.id, { replaceUrl: false });
      } else if (nextRoute.slug) {
        loadCompanyFromApi(nextRoute.slug);
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [companyProfiles]);

  const availableTrades = enabledTrades;
  const hasSelectedTrade = Boolean(trade);

  const selectedService = useMemo(
    () =>
      hasSelectedTrade
        ? serviceCatalog[trade].items.find((item) => item.name === serviceName) || otherService
        : otherService,
    [hasSelectedTrade, serviceCatalog, trade, serviceName]
  );

  const bestCrew = useMemo(() => {
    if (!hasSelectedTrade) {
      return {
        name: "Dispatcher review",
        lead: "Office team",
        distance: 0,
        open: "Company will confirm"
      };
    }
    const eligible = crews.filter((crew) => crew.trade === trade);
    return [...eligible].sort((a, b) => a.distance - b.distance)[0] || crews[0] || {
      name: "Unassigned",
      lead: "Dispatcher",
      distance: 0,
      open: "Needs scheduling"
    };
  }, [crews, hasSelectedTrade, trade]);

  const distanceFee = !hasSelectedTrade ? 0 : zip.trim().endsWith("9") ? 45 : bestCrew.distance > 10 ? 35 : 0;
  const selectedAddOnTotal = addOns
    .filter((item) => selectedAddOns.includes(item.label))
    .reduce((sum, item) => sum + item.price, 0);
  const estimatedPrice = selectedService.base + selectedAddOnTotal + distanceFee;

  function selectTrade(nextTrade) {
    setTrade(nextTrade);
    setServiceName(serviceCatalog[nextTrade].items[0]?.name || "Other");
  }

  function applyPreset(nextPreset) {
    const nextTrades = companyPresets[nextPreset];
    setPreset(nextPreset);
    setEnabledTrades(nextTrades);
    persistCompanySettings({ preset: nextPreset, enabledTrades: nextTrades });
    if (trade && !nextTrades.includes(trade)) {
      setTrade("");
      setServiceName("Other");
    }
  }

  function toggleTrade(nextTrade) {
    const exists = enabledTrades.includes(nextTrade);
    const nextTrades = exists
      ? enabledTrades.filter((item) => item !== nextTrade)
      : [...enabledTrades, nextTrade];
    setPreset("Custom setup");
    setEnabledTrades(nextTrades);
    persistCompanySettings({ preset: "Custom setup", enabledTrades: nextTrades });
    if (trade && !nextTrades.includes(trade)) {
      setTrade("");
      setServiceName("Other");
    }
  }

  function toggleAddOn(label) {
    setSelectedAddOns((current) =>
      current.includes(label) ? current.filter((item) => item !== label) : [...current, label]
    );
  }

  function handlePhotoUpload(event) {
    const files = Array.from(event.target.files || []);
    const nextPhotos = files.map((file) => ({
      name: file.name,
      url: URL.createObjectURL(file)
    }));
    setUploadedPhotos(nextPhotos);
  }

  async function scheduleBooking() {
    const booking = {
      name: customer.name || "New customer",
      trade: hasSelectedTrade ? trade : "Needs classification",
      service: !hasSelectedTrade || serviceName === "Other" ? "Customer-described request" : serviceName,
      window: bestCrew.open,
      price: estimatedPrice,
      paid: estimatedPrice === 0 ? "No payment due" : "Deposit requested",
      distance: bestCrew.distance,
      crew: bestCrew.name,
      lead: bestCrew.lead,
      address: customer.address,
      phone: customer.phone,
      email: customer.email,
      photos: uploadedPhotos,
      notes:
        !hasSelectedTrade || serviceName === "Other"
          ? customServiceDescription || "Customer selected other but did not add details yet."
          : selectedAddOns.length
            ? `Requested: ${selectedAddOns.join(", ")}.`
            : "No special requests yet.",
      contact: "SMS + email queued",
      status: "New",
      priority: !hasSelectedTrade ? "Review" : selectedService.urgency <= 2 ? "High" : "Normal"
    };
    const optimisticBooking = { ...booking, id: `TF-${1051 + bookings.length}` };
    setBookings([optimisticBooking, ...bookings]);
    setSelectedBookingId(optimisticBooking.id);
    setUploadedPhotos([]);
    try {
      const response = await fetch(`/api/companies/${activeCompany.slug}/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(booking)
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Booking save failed.");
      }
      const savedCompany = hydrateCompany(result.company);
      setCompanyProfiles((current) => upsertCompany(current, savedCompany));
      setBookings(savedCompany.bookings);
      setSelectedBookingId(result.booking.id);
      setPersistenceStatus("Booking saved to local API storage");
    } catch (error) {
      setPersistenceStatus(`Booking is local only: ${error.message}`);
    }
  }

  const dailyTotal = bookings.reduce((sum, booking) => sum + booking.price, 0);
  const confirmedCount = bookings.filter((booking) => booking.status === "Confirmed").length;
  const selectedBooking = bookings.find((booking) => booking.id === selectedBookingId) || bookings[0];
  const bookingLink = `/book/${activeCompany.slug}`;
  const dashboardLink = `/dashboard/${activeCompany.slug}`;
  const isBookRoute = currentRoute.view === "book";
  const isDashboardRoute = currentRoute.view === "dashboard";
  const isDemoHub = currentRoute.view === "demo";
  const demoChecklist = [
    { label: "Customer request form is usable", done: true },
    { label: "Business can configure trades/services", done: true },
    { label: "Dispatch can assign and print work orders", done: true },
    { label: "Demo confirmation API responds", done: true },
    { label: "Real company branding and pricing added", done: false },
    { label: "Live SMS/email credentials connected", done: communications.mode === "Live" && deliveryStatus.includes("Sent live") }
  ];

  function loadDemoScenario(scenario) {
    setCustomer(scenario.customer);
    setTrade(scenario.trade);
    setServiceName(scenario.service);
    setCustomServiceDescription(scenario.description);
    setUploadedPhotos([]);
  }

  async function loadCompanyFromApi(slug) {
    if (!slug) return;
    try {
      const response = await fetch(`/api/companies/${slug}`);
      const result = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Company load failed.");
      }
      const company = hydrateCompany(result.company);
      setCompanyProfiles((current) => upsertCompany(current, company));
      applyCompanyState(company);
      setPersistenceStatus("Loaded from local API storage");
    } catch (error) {
      setPersistenceStatus(`Using demo fallback: ${error.message}`);
    }
  }

  function applyCompanyState(company) {
    setActiveCompanyId(company.id);
    setServiceCatalog(company.serviceCatalog);
    setCrews(company.crews);
    setPreset(company.preset);
    setEnabledTrades(company.enabledTrades);
    setBookings(company.bookings || []);
    setSelectedBookingId(company.bookings?.[0]?.id || "");
    setTrade("");
    setServiceName("Other");
    setCustomServiceDescription("");
    setUploadedPhotos([]);
    setDeliveryStatus("");
  }

  function navigateTo(path) {
    window.history.pushState({}, "", path);
    const nextRoute = parseRoute(path);
    setCurrentRoute(nextRoute);
    const routeCompany = companyProfiles.find((company) => company.slug === nextRoute.slug);
    if (routeCompany) {
      switchCompany(routeCompany.id, { replaceUrl: false });
    } else if (nextRoute.slug) {
      loadCompanyFromApi(nextRoute.slug);
    }
  }

  function switchCompany(companyId, options = {}) {
    const nextCompany = companyProfiles.find((company) => company.id === companyId);
    if (!nextCompany) return;
    applyCompanyState(nextCompany);
    if (options.replaceUrl) {
      const prefix = currentRoute.view === "dashboard" ? "dashboard" : currentRoute.view === "book" ? "book" : "";
      if (prefix) {
        window.history.replaceState({}, "", `/${prefix}/${nextCompany.slug}`);
        setCurrentRoute({ view: prefix, slug: nextCompany.slug });
      }
    }
  }

  function resetDemoData() {
    setServiceCatalog(activeCompany.serviceCatalog);
    setCrews(activeCompany.crews);
    setPreset(activeCompany.preset);
    setEnabledTrades(activeCompany.enabledTrades);
    setBookings(activeCompany.bookings);
    setSelectedBookingId(activeCompany.bookings[0]?.id || "");
    setCustomer({
      name: "Jordan Rivera",
      phone: "(407) 555-0184",
      email: "jordan@example.com",
      address: "410 Lakeview Ave"
    });
    setTrade("");
    setServiceName("Other");
    setCustomServiceDescription("");
    setUploadedPhotos([]);
    setDeliveryStatus("");
  }

  function updateBooking(id, updates) {
    setBookings((current) =>
      current.map((booking) => (booking.id === id ? { ...booking, ...updates } : booking))
    );
    persistBookingUpdate(id, updates);
  }

  async function persistBookingUpdate(id, updates) {
    try {
      const response = await fetch(`/api/companies/${activeCompany.slug}/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Booking update failed.");
      }
      const savedCompany = hydrateCompany(result.company);
      setCompanyProfiles((current) => upsertCompany(current, savedCompany));
      setPersistenceStatus("Booking update saved");
    } catch (error) {
      setPersistenceStatus(`Update is local only: ${error.message}`);
    }
  }

  async function sendConfirmation(id) {
    const booking = bookings.find((item) => item.id === id);
    if (!booking) return;

    setDeliveryStatus("Sending confirmation...");
    try {
      const response = await fetch("/api/confirmations/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking, communications })
      });
      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Confirmation failed.");
      }

      updateBooking(id, {
        contact: result.mode === "Live" ? "Live SMS + email sent" : "Demo confirmation sent",
        status: "Confirmed"
      });
      setDeliveryStatus(
        result.mode === "Live"
          ? `Sent live. SMS: ${result.providerIds.sms}; email: ${result.providerIds.email}.`
          : `Demo sent. SMS: ${result.providerIds.sms}; email: ${result.providerIds.email}.`
      );
    } catch (error) {
      setDeliveryStatus(error.message);
      updateBooking(id, {
        contact: "Confirmation needs attention"
      });
    }
  }

  function assignCrew(id, crewName) {
    const tech = crews.find((item) => item.name === crewName);
    updateBooking(id, {
      crew: crewName,
      lead: tech?.lead || "Unassigned",
      distance: tech?.distance || 0,
      window: tech?.open || "Needs scheduling"
    });
  }

  function printWorkOrder() {
    window.print();
  }

  function addServiceLine() {
    const cleanName = newService.name.trim();
    if (!cleanName) return;
    const service = {
      name: cleanName,
      base: Number(newService.base) || 0,
      hours: 2,
      urgency: 3
    };
    const nextCatalog = {
      ...serviceCatalog,
      [newService.trade]: {
        ...serviceCatalog[newService.trade],
        items: [...serviceCatalog[newService.trade].items, service]
      }
    };
    const nextTrades = enabledTrades.includes(newService.trade)
      ? enabledTrades
      : [...enabledTrades, newService.trade];
    setServiceCatalog(nextCatalog);
    setEnabledTrades(nextTrades);
    persistCompanySettings({ serviceCatalog: nextCatalog, enabledTrades: nextTrades });
    setNewService({ ...newService, name: "" });
  }

  function removeServiceLine(serviceTrade, serviceToRemove) {
    const remaining = serviceCatalog[serviceTrade].items.filter(
      (item) => item.name !== serviceToRemove
    );
    const nextCatalog = {
      ...serviceCatalog,
      [serviceTrade]: {
        ...serviceCatalog[serviceTrade],
        items: serviceCatalog[serviceTrade].items.filter((item) => item.name !== serviceToRemove)
      }
    };
    setServiceCatalog(nextCatalog);
    persistCompanySettings({ serviceCatalog: nextCatalog });
    if (trade === serviceTrade && serviceName === serviceToRemove) {
      setServiceName(remaining[0]?.name || "Other");
    }
  }

  function updateServicePrice(serviceTrade, serviceToUpdate, nextPrice) {
    const nextCatalog = {
      ...serviceCatalog,
      [serviceTrade]: {
        ...serviceCatalog[serviceTrade],
        items: serviceCatalog[serviceTrade].items.map((item) =>
          item.name === serviceToUpdate ? { ...item, base: Number(nextPrice) || 0 } : item
        )
      }
    };
    setServiceCatalog(nextCatalog);
    persistCompanySettings({ serviceCatalog: nextCatalog });
  }

  async function persistCompanySettings(updates) {
    const localCompany = hydrateCompany({
      ...activeCompany,
      serviceCatalog,
      crews,
      preset,
      enabledTrades,
      bookings,
      ...updates
    });
    setCompanyProfiles((current) => upsertCompany(current, localCompany));

    try {
      const response = await fetch(`/api/companies/${activeCompany.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Company save failed.");
      }
      const savedCompany = hydrateCompany(result.company);
      setCompanyProfiles((current) => upsertCompany(current, savedCompany));
      setPersistenceStatus("Company settings saved");
    } catch (error) {
      setPersistenceStatus(`Company settings are local only: ${error.message}`);
    }
  }

  function addCrew() {
    const cleanName = newCrew.name.trim();
    const cleanLead = newCrew.lead.trim();
    if (!cleanName || !cleanLead) return;
    const nextCrews = [
      ...crews,
      {
        ...newCrew,
        name: cleanName,
        lead: cleanLead,
        distance: Number(newCrew.distance) || 0
      }
    ];
    const nextTrades = enabledTrades.includes(newCrew.trade) ? enabledTrades : [...enabledTrades, newCrew.trade];
    setCrews(nextCrews);
    setEnabledTrades(nextTrades);
    persistCompanySettings({ crews: nextCrews, enabledTrades: nextTrades });
    setNewCrew({
      ...newCrew,
      name: "",
      lead: ""
    });
  }

  function removeCrew(crewName) {
    if (crews.length <= 1) return;
    const nextCrews = crews.filter((crew) => crew.name !== crewName);
    setCrews(nextCrews);
    persistCompanySettings({ crews: nextCrews });
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark">
            <CalendarClock size={24} />
          </div>
          <div>
            <p className="eyebrow">Archonic Scheduler</p>
            <h1>AI-assisted booking and dispatch for service contractors</h1>
          </div>
        </div>
        <div className="topbar-actions">
          <span className="topbar-badge">Demo MVP</span>
          <button
            className={`icon-button ${openHeaderPanel === "notifications" ? "active-icon" : ""}`}
            aria-label="Notifications"
            onClick={() =>
              setOpenHeaderPanel(openHeaderPanel === "notifications" ? "" : "notifications")
            }
          >
            <Bell size={18} />
          </button>
          <button
            className={`icon-button ${openHeaderPanel === "settings" ? "active-icon" : ""}`}
            aria-label="Settings"
            onClick={() => setOpenHeaderPanel(openHeaderPanel === "settings" ? "" : "settings")}
          >
            <Settings2 size={18} />
          </button>
        </div>
      </header>

      {openHeaderPanel && (
        <section className="header-message-panel">
          <div>
            <strong>{openHeaderPanel === "notifications" ? "Notifications" : "Settings"}</strong>
            <p>
              {openHeaderPanel === "notifications"
                ? "No new notifications yet. New bookings, replies, payment issues, and dispatch alerts will show here."
                : "Company settings are managed in the dashboard below. Account, users, billing, and integrations can live here later."}
            </p>
          </div>
          <button className="panel-close" onClick={() => setOpenHeaderPanel("")}>
            Close
          </button>
        </section>
      )}

      {isDemoHub && <section className="demo-readiness" aria-label="Demo readiness">
        <div className="demo-copy">
          <p className="eyebrow">Demo mode</p>
          <h2>Run a polished contractor walkthrough in under a minute</h2>
          <p>
            Use the presets to run a clean walkthrough: customer request, company review, dispatch,
            confirmation, and printable work order.
          </p>
          <span className="storage-pill">{persistenceStatus}</span>
        </div>
        <div className="company-link-card">
          <label className="field-label">
            Demo company
            <select value={activeCompanyId} onChange={(event) => switchCompany(event.target.value)}>
              {companyProfiles.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </label>
          <div className="link-stack">
            <div>
              <span>Booking link</span>
              <button className="route-link" onClick={() => navigateTo(bookingLink)}>
                {bookingLink}
              </button>
            </div>
            <div>
              <span>Dashboard link</span>
              <button className="route-link" onClick={() => navigateTo(dashboardLink)}>
                {dashboardLink}
              </button>
            </div>
          </div>
        </div>
        <div className="demo-actions">
          {demoCustomers.map((scenario) => (
            <button key={scenario.label} className="demo-button" onClick={() => loadDemoScenario(scenario)}>
              {scenario.label}
            </button>
          ))}
          <button className="demo-button reset" onClick={resetDemoData}>
            Reset demo
          </button>
        </div>
        <div className="demo-checklist">
          {demoChecklist.map((item) => (
            <div className={`check-item ${item.done ? "done" : ""}`} key={item.label}>
              {item.done ? <CheckCircle2 size={16} /> : <Clock3 size={16} />}
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </section>}

      {!isDemoHub && (
        <section className="route-banner">
          <button className="demo-button" onClick={() => navigateTo("/")}>
            Back to demo hub
          </button>
          <span>{isBookRoute ? bookingLink : dashboardLink}</span>
        </section>
      )}

      <section className={`workspace-grid ${isBookRoute ? "booking-only" : ""} ${isDashboardRoute ? "dashboard-only" : ""}`}>
        <section className="booking-panel" aria-label="Customer booking">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Customer side</p>
              <h2>{activeCompany.name}</h2>
              <p className="panel-subtitle">{activeCompany.serviceArea} · {activeCompany.dispatchPhone}</p>
            </div>
            <span className="status-pill">
              <ShieldCheck size={15} />
              Live estimate
            </span>
          </div>

          <div className="trade-grid">
            {availableTrades.map((name) => {
              const config = serviceCatalog[name];
              const Icon = config.icon;
              return (
                <button
                  key={name}
                  className={`trade-button ${trade === name ? "active" : ""}`}
                  onClick={() => selectTrade(name)}
                  style={{ "--accent": config.color }}
                >
                  <Icon size={20} />
                  <span>{name}</span>
                </button>
              );
            })}
          </div>

          {availableTrades.length === 0 && (
            <div className="empty-trades">
              Service choices are not published yet. Describe what you need and the company can classify it.
            </div>
          )}

          {hasSelectedTrade && (
            <label className="field-label">
              Service
              <select value={serviceName} onChange={(event) => setServiceName(event.target.value)}>
                {[...serviceCatalog[trade].items, otherService].map((item) => (
                  <option key={item.name}>{item.name}</option>
                ))}
              </select>
            </label>
          )}

          {(!hasSelectedTrade || serviceName === "Other") && (
            <label className="field-label">
              Describe the job
              <textarea
                value={customServiceDescription}
                onChange={(event) => setCustomServiceDescription(event.target.value)}
                placeholder="Tell us what is happening, where it is happening, and how urgent it feels."
              />
            </label>
          )}

          <div className="two-col">
            <label className="field-label">
              Name
              <input
                value={customer.name}
                onChange={(event) => setCustomer({ ...customer, name: event.target.value })}
              />
            </label>
            <label className="field-label">
              Phone
              <input
                value={customer.phone}
                onChange={(event) => setCustomer({ ...customer, phone: event.target.value })}
              />
            </label>
          </div>

          <div className="two-col">
            <label className="field-label">
              Email
              <input
                value={customer.email}
                onChange={(event) => setCustomer({ ...customer, email: event.target.value })}
              />
            </label>
            <label className="field-label">
              ZIP
              <input value={zip} onChange={(event) => setZip(event.target.value)} />
            </label>
          </div>

          <label className="field-label">
            Address
            <input
              value={customer.address}
              onChange={(event) => setCustomer({ ...customer, address: event.target.value })}
            />
          </label>

          <label className="field-label">
            Photos
            <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} />
          </label>

          {uploadedPhotos.length > 0 && (
            <div className="photo-preview-grid" aria-label="Uploaded photo previews">
              {uploadedPhotos.map((photo) => (
                <figure key={photo.url}>
                  <img src={photo.url} alt={photo.name} />
                  <figcaption>{photo.name}</figcaption>
                </figure>
              ))}
            </div>
          )}

          <div className="add-on-list">
            {addOns.map((item) => (
              <button
                key={item.label}
                className={`add-on ${selectedAddOns.includes(item.label) ? "selected" : ""}`}
                onClick={() => toggleAddOn(item.label)}
              >
                <span>{item.label}</span>
                <strong>{money(item.price)}</strong>
              </button>
            ))}
          </div>

          <div className="quote-strip">
            <div>
              <span>Estimated price</span>
              <strong>{!hasSelectedTrade ? "Review first" : money(estimatedPrice)}</strong>
            </div>
            <div>
              <span>Arrival window</span>
              <strong>{bestCrew.open}</strong>
            </div>
            <div>
              <span>Assigned crew</span>
              <strong>{bestCrew.name}</strong>
            </div>
          </div>

          <button className="primary-action" onClick={scheduleBooking}>
            <CalendarClock size={18} />
            Schedule and send follow-ups
            <ChevronRight size={18} />
          </button>
        </section>

        <section className="dashboard-panel" aria-label="Company dashboard">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Company side</p>
              <h2>{activeCompany.name} dashboard</h2>
              <p className="panel-subtitle">{persistenceStatus}</p>
            </div>
            <button className="filter-button">
              <SlidersHorizontal size={16} />
              Filters
            </button>
          </div>

          <div className="metric-row">
            <Metric icon={ClipboardList} label="Bookings" value={bookings.length} />
            <Metric icon={DollarSign} label="Scheduled value" value={money(dailyTotal)} />
            <Metric icon={Check} label="Confirmed" value={confirmedCount} />
          </div>

          <div className="dispatch-tools">
            <label className="search-box">
              <Search size={16} />
              <input placeholder="Search customer, trade, crew" />
            </label>
            <button className="small-action">
              <Plus size={16} />
              Manual job
            </button>
          </div>

          <div className="company-config">
            <div className="config-title">
              <Sliders size={17} />
              <span>Business profile</span>
            </div>
            <div className="profile-grid">
              <label className="field-label">
                Company type
                <select value={preset} onChange={(event) => applyPreset(event.target.value)}>
                  {Object.keys(companyPresets).map((name) => (
                    <option key={name}>{name}</option>
                  ))}
                </select>
              </label>
              <div>
                <span className="mini-label">Offered trades</span>
                <div className="enabled-trades" aria-label="Enabled service lines">
                  {Object.keys(serviceCatalog).map((name) => (
                    <button
                      key={name}
                      className={`service-toggle ${enabledTrades.includes(name) ? "on" : ""}`}
                      onClick={() => toggleTrade(name)}
                    >
                      {enabledTrades.includes(name) && <Check size={14} />}
                      <span>{name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="admin-config" aria-label="Company customization">
            <div className="admin-column">
              <div className="config-title">
                <ClipboardList size={17} />
                <span>Service menu</span>
              </div>
              <div className="admin-form service-form">
                <select
                  value={newService.trade}
                  onChange={(event) => setNewService({ ...newService, trade: event.target.value })}
                >
                  {Object.keys(serviceCatalog).map((name) => (
                    <option key={name}>{name}</option>
                  ))}
                </select>
                <input
                  value={newService.name}
                  onChange={(event) => setNewService({ ...newService, name: event.target.value })}
                  placeholder="New service name"
                />
                <input
                  value={newService.base}
                  onChange={(event) => setNewService({ ...newService, base: event.target.value })}
                  placeholder="Base price"
                  type="number"
                  min="0"
                />
                <button className="small-action" onClick={addServiceLine}>
                  <Plus size={16} />
                  Add
                </button>
              </div>
              <div className="config-list">
                {availableTrades.flatMap((serviceTrade) =>
                  serviceCatalog[serviceTrade].items.slice(0, 5).map((item) => (
                    <div className="config-row" key={`${serviceTrade}-${item.name}`}>
                      <span>{serviceTrade}</span>
                      <strong>{item.name}</strong>
                      <label className="price-editor">
                        <DollarSign size={13} />
                        <input
                          value={item.base}
                          onChange={(event) =>
                            updateServicePrice(serviceTrade, item.name, event.target.value)
                          }
                          aria-label={`${item.name} base price`}
                          type="number"
                          min="0"
                        />
                      </label>
                      <button
                        className="row-icon"
                        aria-label={`Remove ${item.name}`}
                        onClick={() => removeServiceLine(serviceTrade, item.name)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="admin-column">
              <div className="config-title">
                <Truck size={17} />
                <span>Crew roster</span>
              </div>
              <div className="admin-form crew-form">
                <input
                  value={newCrew.name}
                  onChange={(event) => setNewCrew({ ...newCrew, name: event.target.value })}
                  placeholder="Crew / truck name"
                />
                <input
                  value={newCrew.lead}
                  onChange={(event) => setNewCrew({ ...newCrew, lead: event.target.value })}
                  placeholder="Lead tech"
                />
                <select
                  value={newCrew.trade}
                  onChange={(event) => setNewCrew({ ...newCrew, trade: event.target.value })}
                >
                  {Object.keys(serviceCatalog).map((name) => (
                    <option key={name}>{name}</option>
                  ))}
                </select>
                <button className="small-action" onClick={addCrew}>
                  <Plus size={16} />
                  Add
                </button>
              </div>
              <div className="config-list">
                {crews.map((crew) => (
                  <div className="config-row" key={crew.name}>
                    <span>{crew.trade}</span>
                    <strong>{crew.name}</strong>
                    <em>{crew.lead} · {crew.distance} mi</em>
                    <button
                      className="row-icon"
                      aria-label={`Remove ${crew.name}`}
                      onClick={() => removeCrew(crew.name)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="communications-config" aria-label="SMS and email setup">
            <div className="config-title">
              <MessageSquareText size={17} />
              <span>Confirmation delivery</span>
            </div>
            <div className="comm-grid">
              <label className="field-label">
                Mode
                <select
                  value={communications.mode}
                  onChange={(event) =>
                    setCommunications({ ...communications, mode: event.target.value })
                  }
                >
                  <option>Demo</option>
                  <option>Live</option>
                </select>
              </label>
              <label className="field-label">
                SMS provider
                <input
                  value={communications.smsProvider}
                  onChange={(event) =>
                    setCommunications({ ...communications, smsProvider: event.target.value })
                  }
                />
              </label>
              <label className="field-label">
                Email provider
                <input
                  value={communications.emailProvider}
                  onChange={(event) =>
                    setCommunications({ ...communications, emailProvider: event.target.value })
                  }
                />
              </label>
              <label className="field-label">
                Sender phone
                <input
                  value={communications.fromPhone}
                  onChange={(event) =>
                    setCommunications({ ...communications, fromPhone: event.target.value })
                  }
                />
              </label>
              <label className="field-label">
                Sender email
                <input
                  value={communications.fromEmail}
                  onChange={(event) =>
                    setCommunications({ ...communications, fromEmail: event.target.value })
                  }
                />
              </label>
            </div>
            <div className={`live-readiness ${communications.mode.toLowerCase()}`}>
              <strong>{communications.mode === "Live" ? "Live mode selected" : "Demo mode ready"}</strong>
              <span>
                {communications.mode === "Live"
                  ? "Next step is connecting backend API keys so SMS and email leave the system for real."
                  : "Confirmations are simulated for demos, investor walkthroughs, and contractor feedback."}
              </span>
            </div>
          </div>

          <div className="dispatch-layout">
            <div className="booking-list">
              {bookings.map((booking) => (
                <button
                  className={`booking-card ${selectedBooking.id === booking.id ? "selected-job" : ""}`}
                  key={booking.id}
                  onClick={() => setSelectedBookingId(booking.id)}
                >
                  <div className="booking-main">
                    <span className="job-id">{booking.id}</span>
                    <h3>{booking.name}</h3>
                    <p>{booking.trade} · {booking.service}</p>
                  </div>
                  <div className="booking-details">
                    <Detail icon={Clock3} text={booking.window} />
                    <Detail icon={DollarSign} text={`${money(booking.price)} · ${booking.paid}`} />
                    <Detail icon={Navigation} text={`${booking.distance} mi · ${booking.crew}`} />
                    <Detail icon={MessageSquareText} text={booking.contact} />
                  </div>
                  <span className={`booking-status ${booking.status.toLowerCase().replaceAll(" ", "-")}`}>
                    {booking.status}
                  </span>
                </button>
              ))}
            </div>

            <aside className="work-order" aria-label="Selected job details">
              <div className="work-order-header">
                <div>
                  <p className="eyebrow">Work order</p>
                  <h3>{selectedBooking.id}</h3>
                </div>
                <span className={`booking-status ${selectedBooking.status.toLowerCase().replaceAll(" ", "-")}`}>
                  {selectedBooking.status}
                </span>
              </div>

              <div className="detail-grid">
                <Info label="Customer" value={selectedBooking.name} icon={UserRound} />
                <Info label="Phone" value={selectedBooking.phone} icon={Phone} />
                <Info label="Email" value={selectedBooking.email} icon={Mail} />
                <Info label="Address" value={selectedBooking.address} icon={MapPin} />
                <Info label="Service" value={`${selectedBooking.trade} · ${selectedBooking.service}`} icon={FileText} />
                <Info label="Price" value={`${money(selectedBooking.price)} · ${selectedBooking.paid}`} icon={DollarSign} />
                <Info label="Window" value={selectedBooking.window} icon={Clock3} />
                <Info label="Distance" value={`${selectedBooking.distance} mi from crew`} icon={Route} />
              </div>

              <label className="field-label">
                Assign technician / crew
                <select
                  value={selectedBooking.crew}
                  onChange={(event) => assignCrew(selectedBooking.id, event.target.value)}
                >
                  {crews.map((tech) => (
                    <option key={tech.name} value={tech.name}>
                      {tech.name} - {tech.lead} - {tech.capacity}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field-label">
                Job status
                <select
                  value={selectedBooking.status}
                  onChange={(event) => updateBooking(selectedBooking.id, { status: event.target.value })}
                >
                  <option>New</option>
                  <option>Confirmed</option>
                  <option>Needs photos</option>
                  <option>Dispatched</option>
                  <option>Completed</option>
                </select>
              </label>

              <div className="notes-box">
                <span>Dispatcher notes</span>
                <p>{selectedBooking.notes}</p>
              </div>

              <div className="notes-box">
                <span>Customer photos</span>
                {selectedBooking.photos?.length ? (
                  <div className="work-photo-grid">
                    {selectedBooking.photos.map((photo) => (
                      <figure key={photo.url}>
                        <img src={photo.url} alt={photo.name} />
                        <figcaption>{photo.name}</figcaption>
                      </figure>
                    ))}
                  </div>
                ) : (
                  <p>No photos uploaded.</p>
                )}
              </div>

              <div className="dispatch-actions">
                <button className="confirm-action" onClick={() => sendConfirmation(selectedBooking.id)}>
                  <Send size={16} />
                  Send confirmation
                </button>
                <button className="print-action" onClick={printWorkOrder}>
                  <Printer size={16} />
                  Print
                </button>
              </div>
              {deliveryStatus && <div className="delivery-status">{deliveryStatus}</div>}
            </aside>
          </div>
        </section>
      </section>

      <section className="automation-band">
        <div>
          <MessageSquareText size={18} />
          <span>SMS confirmation, reminder, technician ETA, and review request</span>
        </div>
        <div>
          <Mail size={18} />
          <span>Email receipt, scope summary, payment link, and reschedule link</span>
        </div>
        <div>
          <Truck size={18} />
          <span>Distance from shop or active truck route</span>
        </div>
        <div>
          <MapPin size={18} />
          <span>ZIP-based service area and trip fee rules</span>
        </div>
        <div>
          <Phone size={18} />
          <span>Call-back queue for edge cases</span>
        </div>
      </section>
    </main>
  );
}

function Metric({ icon: Icon, label, value }) {
  return (
    <div className="metric">
      <Icon size={18} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Detail({ icon: Icon, text }) {
  return (
    <div className="detail">
      <Icon size={15} />
      <span>{text}</span>
    </div>
  );
}

function Info({ icon: Icon, label, value }) {
  return (
    <div className="info-row">
      <Icon size={15} />
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function parseRoute(pathname) {
  const [, view, slug] = pathname.split("/");
  if (view === "book" && slug) return { view: "book", slug };
  if (view === "dashboard" && slug) return { view: "dashboard", slug };
  return { view: "demo", slug: "" };
}

function hydrateCompany(company) {
  return {
    ...company,
    serviceCatalog: hydrateServiceCatalog(company.serviceCatalog || services),
    crews: company.crews || [],
    bookings: company.bookings || []
  };
}

function hydrateServiceCatalog(catalog) {
  return Object.fromEntries(
    Object.entries(services).map(([tradeName, defaults]) => {
      const incoming = catalog[tradeName] || {};
      return [
        tradeName,
        {
          ...defaults,
          ...incoming,
          icon: defaults.icon,
          color: incoming.color || defaults.color,
          items: incoming.items || defaults.items
        }
      ];
    })
  );
}

function upsertCompany(companies, company) {
  const exists = companies.some((item) => item.id === company.id);
  if (!exists) return [...companies, company];
  return companies.map((item) => (item.id === company.id ? company : item));
}

createRoot(document.getElementById("root")).render(<App />);
