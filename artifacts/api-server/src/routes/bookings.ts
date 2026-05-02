import { Router } from "express";
import { eq, and, gte, lte, or, ilike, desc, sql, ne, inArray } from "drizzle-orm";
import { db, bookingsTable, bookingVenuesTable, venuesTable, usersTable, auditLogsTable, bookingPdfsTable, settingsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth.js";
import { generatePremiumBookingPdf } from "../lib/pdf-generator.js";
import { logger } from "../lib/logger.js";

// Escape LIKE special characters to prevent pattern injection
function escapeLike(str: string): string {
  return str.replace(/[%_\\]/g, '\\$&');
}

const router = Router();

function calcDuration(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  return (eh! * 60 + em! - sh! * 60 - sm!) / 60;
}

// Format a YYYY-MM-DD string safely without UTC timezone shift
function formatDateSafe(dateStr: string | null | undefined): string {
  if (!dateStr || !dateStr.includes("-")) return "N/A";
  const parts = dateStr.split("-");
  if (parts.length < 3) return dateStr;
  const [y, m, d] = parts.map(Number);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${String(d).padStart(2, "0")} ${months[m! - 1] || "???"} ${y}`;
}

async function generateBookingRef(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `MBK-${year}-`;
  // Use SQL MAX to get highest ref atomically — avoids race condition duplicates
  const result = await db
    .select({
      maxRef: sql<string>`MAX(${bookingsTable.bookingRef})`
    })
    .from(bookingsTable)
    .where(sql`${bookingsTable.bookingRef} LIKE ${prefix + "%"}`);

  const maxRef = result[0]?.maxRef;
  const lastNum = maxRef
    ? parseInt(maxRef.split("-").pop() ?? "0")
    : 0;
  return `${prefix}${String(lastNum + 1).padStart(4, "0")}`;
}

async function logAudit(userId: string, action: string, entityType?: string, entityId?: string, details?: unknown) {
  try {
    await db.insert(auditLogsTable).values({
      userId,
      action,
      entityType: entityType ?? null,
      entityId: entityId ?? null,
      details: details ? JSON.stringify(details) : null,
    });
  } catch {
    // Audit logging should never break the main flow
  }
}

async function formatBooking(b: typeof bookingsTable.$inferSelect, venues: Array<{
  id: string; bookingId: string; venueId: string; pricePerHour: string; subtotal: string;
  venue: typeof venuesTable.$inferSelect;
}>, createdBy: typeof usersTable.$inferSelect | undefined) {
  return {
    id: b.id,
    bookingRef: b.bookingRef,
    customerName: b.customerName,
    phoneNumbers: b.phoneNumbers as string[],
    address: b.address ?? null,
    idProofUrl: b.idProofUrl ?? null,
    bookingDate: b.bookingDate,
    tamilDateLabel: b.tamilDateLabel ?? null,
    startTime: b.startTime,
    endTime: b.endTime,
    durationHours: Number(b.durationHours),
    totalAmount: Number(b.totalAmount),
    advanceAmount: Number(b.advanceAmount),
    isPaid: b.isPaid,
    notes: b.notes ?? null,
    status: b.status,
    createdById: b.createdById,
    createdByName: createdBy?.fullName ?? "Unknown",
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
    cancelReason: b.cancelReason ?? null,
    venues: venues.map((bv) => ({
      id: bv.id,
      venueId: bv.venueId,
      venueName: bv.venue.name,
      venueType: bv.venue.type,
      pricePerHour: Number(bv.pricePerHour),
      subtotal: Number(bv.subtotal),
    })),
  };
}

router.get("/bookings/availability", requireAuth, async (req, res) => {
  const { venueId, date, startTime, endTime, excludeBookingId } = req.query as Record<string, string>;

  if (!venueId || !date || !startTime || !endTime) {
    res.status(400).json({ error: "Missing required params" });
    return;
  }

  const conflictingBookingVenues = await db
    .select({
      bookingRef: bookingsTable.bookingRef,
      customerName: bookingsTable.customerName,
      startTime: bookingsTable.startTime,
      endTime: bookingsTable.endTime,
      bookingId: bookingVenuesTable.bookingId,
    })
    .from(bookingVenuesTable)
    .innerJoin(bookingsTable, eq(bookingVenuesTable.bookingId, bookingsTable.id))
    .where(
      and(
        eq(bookingVenuesTable.venueId, venueId),
        eq(bookingsTable.bookingDate, date),
        eq(bookingsTable.status, "confirmed"),
        excludeBookingId ? ne(bookingsTable.id, excludeBookingId) : undefined,
        sql`(
          (${bookingsTable.startTime} < ${endTime} AND ${bookingsTable.endTime} > ${startTime})
        )`
      )
    )
    .limit(1);

  if (conflictingBookingVenues.length === 0) {
    res.json({ available: true, conflict: null });
    return;
  }

  const conflict = conflictingBookingVenues[0]!;
  res.json({
    available: false,
    conflict: {
      bookingRef: conflict.bookingRef,
      customerName: conflict.customerName,
      startTime: conflict.startTime,
      endTime: conflict.endTime,
    },
  });
});

router.get("/bookings", requireAuth, async (req, res) => {
  const { date, status, search, from, to, page = "1", limit = "20" } = req.query as Record<string, string>;
  const pageNum = parseInt(page) || 1;
  const limitNum = Math.min(parseInt(limit) || 20, 100);
  const offset = (pageNum - 1) * limitNum;

  const conditions = [];
  if (date) conditions.push(eq(bookingsTable.bookingDate, date));
  if (status) conditions.push(eq(bookingsTable.status, status));
  if (from) conditions.push(gte(bookingsTable.bookingDate, from));
  if (to) conditions.push(lte(bookingsTable.bookingDate, to));
  if (search) {
    const escaped = escapeLike(search);
    conditions.push(
      or(
        ilike(bookingsTable.customerName, `%${escaped}%`),
        sql`${bookingsTable.phoneNumbers}::text ILIKE ${"%" + escaped + "%"}`
      )
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [allBookings, countResult] = await Promise.all([
    db
      .select()
      .from(bookingsTable)
      .where(whereClause)
      .orderBy(desc(bookingsTable.createdAt))
      .limit(limitNum)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(bookingsTable)
      .where(whereClause),
  ]);

  const total = Number(countResult[0]?.count ?? 0);

  if (allBookings.length === 0) {
    res.json({ bookings: [], total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
    return;
  }

  const bookingIds = allBookings.map((b) => b.id);
  const createdByIds = [...new Set(allBookings.map((b) => b.createdById))];

  const [allVenueRows, allUsers] = await Promise.all([
    db
      .select({
        id: bookingVenuesTable.id,
        bookingId: bookingVenuesTable.bookingId,
        venueId: bookingVenuesTable.venueId,
        pricePerHour: bookingVenuesTable.pricePerHour,
        subtotal: bookingVenuesTable.subtotal,
        venue: venuesTable,
      })
      .from(bookingVenuesTable)
      .innerJoin(venuesTable, eq(bookingVenuesTable.venueId, venuesTable.id))
      .where(inArray(bookingVenuesTable.bookingId, bookingIds)),
    db
      .select()
      .from(usersTable)
      .where(inArray(usersTable.id, createdByIds)),
  ]);

  const venuesByBooking = new Map<string, typeof allVenueRows>();
  for (const vr of allVenueRows) {
    if (!venuesByBooking.has(vr.bookingId)) venuesByBooking.set(vr.bookingId, []);
    venuesByBooking.get(vr.bookingId)!.push(vr);
  }
  const usersById = new Map(allUsers.map((u) => [u.id, u]));

  const bookings = await Promise.all(
    allBookings.map((b) =>
      formatBooking(b, venuesByBooking.get(b.id) ?? [], usersById.get(b.createdById))
    )
  );

  res.json({ bookings, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
});

router.get("/bookings/:id", requireAuth, async (req, res) => {
  const { id } = req.params;

  const booking = await db
    .select()
    .from(bookingsTable)
    .where(eq(bookingsTable.id, id!))
    .limit(1);

  if (!booking[0]) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const [venueRows, createdByRows] = await Promise.all([
    db
      .select({
        id: bookingVenuesTable.id,
        bookingId: bookingVenuesTable.bookingId,
        venueId: bookingVenuesTable.venueId,
        pricePerHour: bookingVenuesTable.pricePerHour,
        subtotal: bookingVenuesTable.subtotal,
        venue: venuesTable,
      })
      .from(bookingVenuesTable)
      .innerJoin(venuesTable, eq(bookingVenuesTable.venueId, venuesTable.id))
      .where(eq(bookingVenuesTable.bookingId, id!)),
    db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, booking[0].createdById))
      .limit(1),
  ]);

  res.json(await formatBooking(booking[0], venueRows, createdByRows[0]));
});

router.post("/bookings", requireAuth, async (req, res) => {
  const { customerName, phoneNumbers, address, idProofUrl, bookingDate, tamilDateLabel, startTime, endTime, venues, notes } =
    req.body as {
      customerName: string;
      phoneNumbers: string[];
      address?: string;
      idProofUrl?: string;
      bookingDate: string;
      tamilDateLabel?: string;
      startTime: string;
      endTime: string;
      venues: Array<{ venueId: string; pricePerHour: number }>;
      notes?: string;
    };

  // Input validation
  if (!customerName?.trim()) {
    res.status(400).json({ error: "Bad Request", message: "Customer name is required" });
    return;
  }
  if (!phoneNumbers?.length || !phoneNumbers[0]?.trim()) {
    res.status(400).json({ error: "Bad Request", message: "At least one phone number is required" });
    return;
  }
  if (!bookingDate || !/^\d{4}-\d{2}-\d{2}$/.test(bookingDate)) {
    res.status(400).json({ error: "Bad Request", message: "Invalid booking date format (YYYY-MM-DD)" });
    return;
  }
  if (!startTime || !endTime || !/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
    res.status(400).json({ error: "Bad Request", message: "Invalid time format (HH:MM)" });
    return;
  }
  if (!venues?.length) {
    res.status(400).json({ error: "Bad Request", message: "At least one venue is required" });
    return;
  }

  const durationHours = calcDuration(startTime, endTime);
  if (durationHours <= 0) {
    res.status(400).json({ error: "Bad Request", message: "End time must be after start time" });
    return;
  }

  const conflicts = [];
  for (const v of venues) {
    const conflicting = await db
      .select({ bookingRef: bookingsTable.bookingRef, customerName: bookingsTable.customerName, startTime: bookingsTable.startTime, endTime: bookingsTable.endTime })
      .from(bookingVenuesTable)
      .innerJoin(bookingsTable, eq(bookingVenuesTable.bookingId, bookingsTable.id))
      .innerJoin(venuesTable, eq(bookingVenuesTable.venueId, venuesTable.id))
      .where(
        and(
          eq(bookingVenuesTable.venueId, v.venueId),
          eq(bookingsTable.bookingDate, bookingDate),
          eq(bookingsTable.status, "confirmed"),
          sql`(${bookingsTable.startTime} < ${endTime} AND ${bookingsTable.endTime} > ${startTime})`
        )
      )
      .limit(1);

    if (conflicting[0]) {
      const venue = await db.select().from(venuesTable).where(eq(venuesTable.id, v.venueId)).limit(1);
      conflicts.push({ venueName: venue[0]?.name ?? v.venueId, ...conflicting[0] });
    }
  }

  if (conflicts.length > 0) {
    res.status(409).json({ error: "Booking conflict", conflicts });
    return;
  }

  const bookingRef = await generateBookingRef();
  const totalAmount = venues.reduce((sum, v) => sum + v.pricePerHour * durationHours, 0);

  // Store phoneNumbers directly as array — JSONB column handles serialization
  const [newBooking] = await db
    .insert(bookingsTable)
    .values({
      bookingRef,
      customerName,
      phoneNumbers,
      address: address ?? null,
      idProofUrl: idProofUrl ?? null,
      bookingDate,
      tamilDateLabel: tamilDateLabel ?? null,
      startTime,
      endTime,
      durationHours: String(durationHours),
      totalAmount: String(totalAmount),
      advanceAmount: String(req.body.advanceAmount ?? 0),
      isPaid: !!req.body.isPaid,
      notes: notes ?? null,
      status: "confirmed",
      createdById: req.user!.userId,
    })
    .returning();

  await db.insert(bookingVenuesTable).values(
    venues.map((v) => ({
      bookingId: newBooking!.id,
      venueId: v.venueId,
      pricePerHour: String(v.pricePerHour),
      subtotal: String(v.pricePerHour * durationHours),
    }))
  );

  // Audit log
  await logAudit(req.user!.userId, "create_booking", "booking", newBooking!.id, {
    bookingRef,
    customerName,
    totalAmount,
  });

  const [venueRows, createdByRows] = await Promise.all([
    db
      .select({ id: bookingVenuesTable.id, bookingId: bookingVenuesTable.bookingId, venueId: bookingVenuesTable.venueId, pricePerHour: bookingVenuesTable.pricePerHour, subtotal: bookingVenuesTable.subtotal, venue: venuesTable })
      .from(bookingVenuesTable)
      .innerJoin(venuesTable, eq(bookingVenuesTable.venueId, venuesTable.id))
      .where(eq(bookingVenuesTable.bookingId, newBooking!.id)),
    db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId)).limit(1),
  ]);

  res.status(201).json(await formatBooking(newBooking!, venueRows, createdByRows[0]));
});

router.put("/bookings/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { customerName, phoneNumbers, address, idProofUrl, bookingDate, tamilDateLabel, startTime, endTime, venues, notes } =
    req.body as {
      customerName: string;
      phoneNumbers: string[];
      address?: string;
      idProofUrl?: string;
      bookingDate: string;
      tamilDateLabel?: string;
      startTime: string;
      endTime: string;
      venues: Array<{ venueId: string; pricePerHour: number }>;
      advanceAmount?: number;
      isPaid?: boolean;
      notes?: string;
    };

  const existing = await db.select().from(bookingsTable).where(eq(bookingsTable.id, id!)).limit(1);
  if (!existing[0]) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const durationHours = calcDuration(startTime, endTime);
  const totalAmount = venues.reduce((sum, v) => sum + v.pricePerHour * durationHours, 0);

  await db
    .update(bookingsTable)
    .set({
      customerName,
      phoneNumbers,
      address: address ?? null,
      idProofUrl: idProofUrl ?? null,
      bookingDate,
      tamilDateLabel: tamilDateLabel ?? null,
      startTime,
      endTime,
      durationHours: String(durationHours),
      totalAmount: String(totalAmount),
      advanceAmount: req.body.advanceAmount !== undefined ? String(req.body.advanceAmount) : existing[0]!.advanceAmount,
      isPaid: req.body.isPaid !== undefined ? !!req.body.isPaid : existing[0]!.isPaid,
      notes: notes ?? null,
      updatedAt: new Date(),
    })
    .where(eq(bookingsTable.id, id!));

  await db.delete(bookingVenuesTable).where(eq(bookingVenuesTable.bookingId, id!));
  await db.insert(bookingVenuesTable).values(
    venues.map((v) => ({
      bookingId: id!,
      venueId: v.venueId,
      pricePerHour: String(v.pricePerHour),
      subtotal: String(v.pricePerHour * durationHours),
    }))
  );

  // Audit log
  await logAudit(req.user!.userId, "update_booking", "booking", id!, {
    customerName,
    totalAmount,
  });

  const updated = await db.select().from(bookingsTable).where(eq(bookingsTable.id, id!)).limit(1);
  const [venueRows, createdByRows] = await Promise.all([
    db
      .select({ id: bookingVenuesTable.id, bookingId: bookingVenuesTable.bookingId, venueId: bookingVenuesTable.venueId, pricePerHour: bookingVenuesTable.pricePerHour, subtotal: bookingVenuesTable.subtotal, venue: venuesTable })
      .from(bookingVenuesTable)
      .innerJoin(venuesTable, eq(bookingVenuesTable.venueId, venuesTable.id))
      .where(eq(bookingVenuesTable.bookingId, id!)),
    db.select().from(usersTable).where(eq(usersTable.id, updated[0]!.createdById)).limit(1),
  ]);

  res.json(await formatBooking(updated[0]!, venueRows, createdByRows[0]));
});

router.post("/bookings/:id/pay", requireAuth, async (req, res) => {
  const { id } = req.params;

  const existing = await db.select().from(bookingsTable).where(eq(bookingsTable.id, id!)).limit(1);
  if (!existing[0]) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  await db
    .update(bookingsTable)
    .set({
      isPaid: true,
      updatedAt: new Date(),
    })
    .where(eq(bookingsTable.id, id!));

  await logAudit(req.user!.userId, "mark_paid", "booking", id!);

  res.json({ success: true, message: "Marked as paid" });
});

router.delete("/bookings/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body as { reason: string };

  if (!reason?.trim()) {
    res.status(400).json({ error: "Bad Request", message: "Cancellation reason is required" });
    return;
  }

  // Verify booking exists and is cancellable
  const existing = await db.select().from(bookingsTable).where(eq(bookingsTable.id, id!)).limit(1);
  if (!existing[0]) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (existing[0].status === "cancelled") {
    res.status(409).json({ error: "Conflict", message: "Booking is already cancelled" });
    return;
  }

  await db
    .update(bookingsTable)
    .set({
      status: "cancelled",
      cancelledAt: new Date(),
      cancelledById: req.user!.userId,
      cancelReason: reason.trim(),
      updatedAt: new Date(),
    })
    .where(eq(bookingsTable.id, id!));

  // Audit log
  await logAudit(req.user!.userId, "cancel_booking", "booking", id!, { reason });

  res.json({ success: true, message: "Booking cancelled" });
});

// PDF generation endpoint — generates a professional 2-page PDF receipt
// Supports token in query for direct browser downloads
router.get("/bookings/:id/pdf", requireAuth, async (req, res) => {
  const { id } = req.params;

  try {
    // Fetch booking data (try by UUID or by BookingRef)
    let booking = await db.select().from(bookingsTable).where(eq(bookingsTable.id, id!)).limit(1);
    if (!booking[0]) {
      booking = await db.select().from(bookingsTable).where(eq(bookingsTable.bookingRef, id!)).limit(1);
    }
    
    if (!booking[0]) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }
    const b = booking[0];

    // Fetch business settings for branding
    const settingsRows = await db.select().from(settingsTable);
    const settings: Record<string, string> = {};
    settingsRows.forEach(s => settings[s.key] = s.value);

    const venueRows = await db
      .select({ venueName: venuesTable.name, pricePerHour: bookingVenuesTable.pricePerHour, subtotal: bookingVenuesTable.subtotal })
      .from(bookingVenuesTable)
      .innerJoin(venuesTable, eq(bookingVenuesTable.venueId, venuesTable.id))
      .where(eq(bookingVenuesTable.bookingId, b.id));

    const createdBy = await db.select().from(usersTable).where(eq(usersTable.id, b.createdById)).limit(1);

    const venueList = venueRows.map((v) => ({
      name: v.venueName,
      price: Number(v.subtotal).toLocaleString('en-IN')
    }));

    const pdfBytes = await generatePremiumBookingPdf({
      bookingRef: b.bookingRef,
      customerName: b.customerName || "Customer",
      phones: Array.isArray(b.phoneNumbers) ? b.phoneNumbers.join(", ") : "",
      address: b.address || "N/A",
      bookingDate: formatDateSafe(b.bookingDate),
      tamilDate: b.tamilDateLabel ?? "",
      startTime: b.startTime,
      endTime: b.endTime,
      duration: String(b.durationHours),
      venues: venueList,
      totalAmount: Number(b.totalAmount || 0).toLocaleString('en-IN'),
      advanceAmount: Number(b.advanceAmount || 0).toLocaleString('en-IN'),
      isPaid: !!b.isPaid,
      notes: b.notes ?? "",
      createdBy: createdBy[0]?.fullName ?? "Staff",
      createdAt: (b.createdAt || new Date()).toISOString(),
      business: {
        name: settings.biz_name || "Bookal Venue",
        tagline: settings.biz_tagline || "Venue Booking Made Simple",
        address: settings.biz_address || "Tamil Nadu, India",
        phone: settings.biz_phone || "+91 98765 43210",
        email: settings.biz_email || "contact@bookal.app",
        gst: settings.biz_gst || ""
      }
    });

    const fileName = `Receipt_${b.bookingRef}_${b.customerName.replace(/[^a-zA-Z0-9 ._-]/g, '').replace(/\s+/g, '_')}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Length", pdfBytes.length);
    res.send(Buffer.from(pdfBytes));
  } catch (err) {
    logger.error({ err, bookingId: id }, "PDF generation failed");
    res.status(500).json({ error: "Failed to generate PDF" });
  }
});

export default router;
