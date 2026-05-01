import { Router } from "express";
import { or, ilike, sql } from "drizzle-orm";
import { db, bookingsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.get("/customers/search", requireAuth, async (req, res) => {
  const { q } = req.query as { q?: string };

  if (!q || q.trim().length < 1) {
    res.json([]);
    return;
  }

  const results = await db
    .selectDistinctOn([bookingsTable.customerName], {
      customerName: bookingsTable.customerName,
      phoneNumbers: bookingsTable.phoneNumbers,
      address: bookingsTable.address,
    })
    .from(bookingsTable)
    .where(
      or(
        ilike(bookingsTable.customerName, `%${q}%`),
        sql`${bookingsTable.phoneNumbers}::text ILIKE ${"%" + q + "%"}`
      )
    )
    .limit(10);

  res.json(
    results.map((r) => ({
      customerName: r.customerName,
      phoneNumbers: r.phoneNumbers as string[],
      address: r.address ?? null,
    }))
  );
});

export default router;
