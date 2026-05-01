import { Router } from "express";
import { eq, and, gte, lte, or, ilike, desc, sql, ne } from "drizzle-orm";
import { db, bookingsTable, bookingVenuesTable, venuesTable, usersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

function calcDuration(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  return (eh * 60 + em - sh * 60 - sm) / 60;
}

async function generateBookingRef(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `MBK-${year}-`;
  const lastBooking = await db
    .select({ bookingRef: bookingsTable.bookingRef })
    .from(bookingsTable)
    .where(sql`${bookingsTable.bookingRef} LIKE ${prefix + "%"}`)
    .orderBy(desc(bookingsTable.createdAt))
    .limit(1);

  const lastNum = lastBooking[0]
    ? parseInt(lastBooking[0].bookingRef.split("-")[2] ?? "0")
    : 0;
  return `${prefix}${String(lastNum + 1).padStart(4, "0")}`;
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
    conditions.push(
      or(
        ilike(bookingsTable.customerName, `%${search}%`),
        sql`${bookingsTable.phoneNumbers}::text ILIKE ${"%" + search + "%"}`
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
      .where(sql`${bookingVenuesTable.bookingId} = ANY(${sql.raw(`ARRAY[${bookingIds.map((id) => `'${id}'`).join(",")}]::uuid[]`)})`),
    db
      .select()
      .from(usersTable)
      .where(sql`${usersTable.id} = ANY(${sql.raw(`ARRAY[${createdByIds.map((id) => `'${id}'`).join(",")}]::uuid[]`)})`),
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

  const [newBooking] = await db
    .insert(bookingsTable)
    .values({
      bookingRef,
      customerName,
      phoneNumbers: JSON.stringify(phoneNumbers),
      address: address ?? null,
      idProofUrl: idProofUrl ?? null,
      bookingDate,
      tamilDateLabel: tamilDateLabel ?? null,
      startTime,
      endTime,
      durationHours: String(durationHours),
      totalAmount: String(totalAmount),
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
      phoneNumbers: JSON.stringify(phoneNumbers),
      address: address ?? null,
      idProofUrl: idProofUrl ?? null,
      bookingDate,
      tamilDateLabel: tamilDateLabel ?? null,
      startTime,
      endTime,
      durationHours: String(durationHours),
      totalAmount: String(totalAmount),
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

router.delete("/bookings/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body as { reason: string };

  await db
    .update(bookingsTable)
    .set({
      status: "cancelled",
      cancelledAt: new Date(),
      cancelReason: reason,
      updatedAt: new Date(),
    })
    .where(eq(bookingsTable.id, id!));

  res.json({ success: true, message: "Booking cancelled" });
});

export default router;
