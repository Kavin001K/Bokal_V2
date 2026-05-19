/**
 * Release smoke test:
 * - Login as admin
 * - Ensure at least one venue exists
 * - Create booking
 * - Generate booking PDF
 */

const domain = process.env.SMOKE_BASE_URL ?? process.env.EXPO_PUBLIC_DOMAIN ?? "backend.bookal.kavin.cyou";
const baseUrl = domain.startsWith("http://") || domain.startsWith("https://")
  ? domain
  : `https://${domain}`;
const email = process.env.SMOKE_ADMIN_EMAIL;
const password = process.env.SMOKE_ADMIN_PASSWORD;

if (!email || !password) {
  throw new Error("Set SMOKE_ADMIN_EMAIL and SMOKE_ADMIN_PASSWORD before running smoke test.");
}

const now = Date.now();
const bookingDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

async function request(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, init);
  return response;
}

function assert(ok, message) {
  if (!ok) throw new Error(message);
}

async function main() {
  console.log(`[smoke] base url: ${baseUrl}`);

  const loginRes = await request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  assert(loginRes.ok, `Login failed (${loginRes.status})`);
  const loginData = await loginRes.json();
  const token = loginData.token;
  assert(!!token, "No token returned from login");

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const venuesRes = await request("/api/venues?all=true", { headers: authHeaders });
  assert(venuesRes.ok, `Fetching venues failed (${venuesRes.status})`);
  const venues = await venuesRes.json();

  let venue = venues[0];
  if (!venue) {
    const createVenueRes = await request("/api/venues", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        name: `Smoke Hall ${now}`,
        type: "mahal",
        venueCategory: "hall",
        amenities: [],
        colorTag: "#C75B2A",
        pricePerHour: 1200,
        displayOrder: 1,
      }),
    });
    assert(createVenueRes.ok, `Venue creation failed (${createVenueRes.status})`);
    venue = await createVenueRes.json();
  }

  const createBookingRes = await request("/api/bookings", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      customerName: `Smoke Customer ${now}`,
      phoneNumbers: ["9876543210"],
      address: "Pollachi",
      bookingDate,
      startTime: "10:00",
      endTime: "12:00",
      tamilDateLabel: "சோதனை",
      venues: [{ venueId: venue.id, pricePerHour: Number(venue.pricePerHour ?? 1200) }],
      notes: "release smoke",
    }),
  });
  assert(createBookingRes.ok, `Create booking failed (${createBookingRes.status})`);
  const booking = await createBookingRes.json();
  assert(!!booking.id, "Booking creation did not return id");

  const pdfRes = await request(`/api/bookings/${booking.id}/pdf`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(pdfRes.ok, `PDF endpoint failed (${pdfRes.status})`);
  const contentType = pdfRes.headers.get("content-type") ?? "";
  assert(contentType.includes("application/pdf"), `Unexpected PDF content-type: ${contentType}`);

  console.log("[smoke] PASS");
  console.log(`[smoke] booking id: ${booking.id}`);
  console.log(`[smoke] booking ref: ${booking.bookingRef}`);
}

main().catch((err) => {
  console.error("[smoke] FAIL:", err.message);
  process.exit(1);
});
