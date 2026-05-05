import { Router } from "express";
import { and, gte, lte, eq, sql } from "drizzle-orm";
import { db, bookingsTable, bookingVenuesTable, venuesTable, usersTable, settingsTable } from "@workspace/db";
import { requireAdmin, requireAuth } from "../middlewares/auth.js";
import { generateProfessionalReportPdf } from "../lib/pdf-generator.js";

function parseDecimal(val: string | null | undefined): number {
  if (val === null || val === undefined || val === "") return 0;
  return parseFloat(val);
}

const router = Router();

router.get("/reports/summary", requireAdmin, async (req, res) => {
  const { from, to } = req.query as { from: string; to: string };

  if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    res.status(400).json({ error: "Valid 'from' and 'to' dates (YYYY-MM-DD) are required" });
    return;
  }

  const whereClause = and(
    gte(bookingsTable.bookingDate, from),
    lte(bookingsTable.bookingDate, to),
    eq(bookingsTable.adminId, req.user!.adminId)
  );

  const [bookings, venueRows, userRows] = await Promise.all([
    db.select().from(bookingsTable).where(whereClause),
    db
      .select({
        bookingId: bookingVenuesTable.bookingId,
        venueId: bookingVenuesTable.venueId,
        subtotal: bookingVenuesTable.subtotal,
        venueName: venuesTable.name,
      })
      .from(bookingVenuesTable)
      .innerJoin(venuesTable, eq(bookingVenuesTable.venueId, venuesTable.id))
      .innerJoin(bookingsTable, eq(bookingVenuesTable.bookingId, bookingsTable.id))
      .where(whereClause),
    db.select({ id: usersTable.id, fullName: usersTable.fullName }).from(usersTable).where(eq(usersTable.adminId, req.user!.adminId)),
  ]);

  const notCancelled = bookings.filter((b) => b.status !== "cancelled");
  const totalRevenue = notCancelled.reduce((sum, b) => sum + parseDecimal(b.totalAmount), 0);
  const avgBookingValue = notCancelled.length > 0 ? totalRevenue / notCancelled.length : 0;

  const byVenueMap = new Map<string, { venueName: string; bookingCount: number; revenue: number }>();
  for (const vr of venueRows) {
    const bk = bookings.find((b) => b.id === vr.bookingId);
    if (bk?.status === "cancelled") continue;
    if (!byVenueMap.has(vr.venueId)) {
      byVenueMap.set(vr.venueId, { venueName: vr.venueName, bookingCount: 0, revenue: 0 });
    }
    const entry = byVenueMap.get(vr.venueId)!;
    entry.bookingCount += 1;
    entry.revenue += parseDecimal(vr.subtotal);
  }

  const byDayMap = new Map<string, { bookingCount: number; revenue: number }>();
  for (const b of notCancelled) {
    if (!byDayMap.has(b.bookingDate)) byDayMap.set(b.bookingDate, { bookingCount: 0, revenue: 0 });
    const entry = byDayMap.get(b.bookingDate)!;
    entry.bookingCount += 1;
    entry.revenue += parseDecimal(b.totalAmount);
  }

  const byEmployeeMap = new Map<string, { userName: string; bookingCount: number; revenue: number }>();
  for (const b of notCancelled) {
    const user = userRows.find((u) => u.id === b.createdById);
    if (!byEmployeeMap.has(b.createdById)) {
      byEmployeeMap.set(b.createdById, { userName: user?.fullName ?? "Unknown", bookingCount: 0, revenue: 0 });
    }
    const entry = byEmployeeMap.get(b.createdById)!;
    entry.bookingCount += 1;
    entry.revenue += parseDecimal(b.totalAmount);
  }

  res.json({
    totalBookings: bookings.length,
    totalRevenue,
    confirmedBookings: bookings.filter((b) => b.status === "confirmed").length,
    cancelledBookings: bookings.filter((b) => b.status === "cancelled").length,
    avgBookingValue,
    byVenue: Array.from(byVenueMap.entries()).map(([venueId, data]) => ({ venueId, ...data })),
    byDay: Array.from(byDayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({ date, ...data })),
    byEmployee: Array.from(byEmployeeMap.entries()).map(([userId, data]) => ({ userId, ...data })),
  });
});

router.get("/reports/export", requireAdmin, async (req, res) => {
  const { from, to } = req.query as { from: string; to: string };

  if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    res.status(400).json({ error: "Valid 'from' and 'to' dates (YYYY-MM-DD) are required" });
    return;
  }

  const bookings = await db
    .select({
      booking: bookingsTable,
      createdByName: usersTable.fullName,
    })
    .from(bookingsTable)
    .innerJoin(usersTable, eq(bookingsTable.createdById, usersTable.id))
    .where(and(
      gte(bookingsTable.bookingDate, from), 
      lte(bookingsTable.bookingDate, to),
      eq(bookingsTable.adminId, req.user!.adminId)
    ));

  const venueRows = await db
    .select({ bookingId: bookingVenuesTable.bookingId, venueName: venuesTable.name })
    .from(bookingVenuesTable)
    .innerJoin(venuesTable, eq(bookingVenuesTable.venueId, venuesTable.id));

  const venuesByBooking = new Map<string, string[]>();
  for (const vr of venueRows) {
    if (!venuesByBooking.has(vr.bookingId)) venuesByBooking.set(vr.bookingId, []);
    venuesByBooking.get(vr.bookingId)!.push(vr.venueName);
  }

  const headers = ["Booking Ref", "Customer", "Phone", "Date", "Tamil Date", "Start", "End", "Venues", "Total (Rs)", "Status", "Created By"];
  const rows = bookings.map(({ booking: b, createdByName }) => [
    b.bookingRef,
    b.customerName,
    (b.phoneNumbers as string[])[0] ?? "",
    b.bookingDate,
    b.tamilDateLabel ?? "",
    b.startTime,
    b.endTime,
    (venuesByBooking.get(b.id) ?? []).join("; "),
    String(b.totalAmount),
    b.status,
    createdByName,
  ]);

  const csv = [
    headers.join(","),
    ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")),
  ].join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="Bookal_Report_${from}_to_${to}.csv"`);
  res.send(csv);
});

router.get("/reports/pdf", requireAdmin, async (req, res) => {
  const { from, to } = req.query as { from: string; to: string };

  if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    res.status(400).json({ error: "Valid dates required" });
    return;
  }

  try {
    const whereClause = and(
      gte(bookingsTable.bookingDate, from),
      lte(bookingsTable.bookingDate, to),
      eq(bookingsTable.adminId, req.user!.adminId)
    );

    const [bookings, venueRows, userRows] = await Promise.all([
      db.select().from(bookingsTable).where(whereClause),
      db
        .select({
          bookingId: bookingVenuesTable.bookingId,
          venueId: bookingVenuesTable.venueId,
          subtotal: bookingVenuesTable.subtotal,
          venueName: venuesTable.name,
        })
        .from(bookingVenuesTable)
        .innerJoin(venuesTable, eq(bookingVenuesTable.venueId, venuesTable.id))
        .innerJoin(bookingsTable, eq(bookingVenuesTable.bookingId, bookingsTable.id))
        .where(whereClause),
      db.select({ id: usersTable.id, fullName: usersTable.fullName }).from(usersTable).where(eq(usersTable.adminId, req.user!.adminId)),
    ]);

    const notCancelled = bookings.filter((b) => b.status !== "cancelled");
    const totalRevenue = notCancelled.reduce((sum, b) => sum + parseDecimal(b.totalAmount), 0);

    const byVenueMap = new Map<string, { name: string; revenue: number; count: number }>();
    for (const vr of venueRows) {
      const bk = bookings.find((b) => b.id === vr.bookingId);
      if (bk?.status === "cancelled") continue;
      if (!byVenueMap.has(vr.venueId)) byVenueMap.set(vr.venueId, { name: vr.venueName, revenue: 0, count: 0 });
      const entry = byVenueMap.get(vr.venueId)!;
      entry.revenue += parseDecimal(vr.subtotal);
      entry.count += 1;
    }

    const byEmployeeMap = new Map<string, { name: string; revenue: number; count: number }>();
    for (const b of notCancelled) {
      const user = userRows.find((u) => u.id === b.createdById);
      if (!byEmployeeMap.has(b.createdById)) byEmployeeMap.set(b.createdById, { name: user?.fullName ?? "Unknown", revenue: 0, count: 0 });
      const entry = byEmployeeMap.get(b.createdById)!;
      entry.revenue += parseDecimal(b.totalAmount);
      entry.count += 1;
    }

    const pdfBytes = await generateProfessionalReportPdf({
      from,
      to,
      totalRevenue: totalRevenue.toLocaleString('en-IN'),
      totalBookings: bookings.length,
      confirmedBookings: bookings.filter(b => b.status === "confirmed").length,
      cancelledBookings: bookings.filter(b => b.status === "cancelled").length,
      avgValue: (notCancelled.length > 0 ? totalRevenue / notCancelled.length : 0).toLocaleString('en-IN'),
      byVenue: Array.from(byVenueMap.values()).map(v => ({ ...v, revenue: v.revenue.toLocaleString('en-IN') })),
      byEmployee: Array.from(byEmployeeMap.values()).map(e => ({ ...e, revenue: e.revenue.toLocaleString('en-IN') })),
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="Bookal_Financial_Report_${from}_to_${to}.pdf"`);
    res.send(Buffer.from(pdfBytes));
  } catch (err) {
    res.status(500).json({ error: "Failed to generate report PDF" });
  }
});

export default router;
