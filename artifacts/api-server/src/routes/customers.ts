import { Router } from "express";
import { or, ilike, sql } from "drizzle-orm";
import { db, bookingsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth.js";
import { logger } from "../lib/logger.js";

const router = Router();

router.get("/customers/search", requireAuth, async (req, res) => {
  try {
    const { q } = req.query as { q?: string };

    if (!q || q.trim().length < 1) {
      res.json([]);
      return;
    }

    // Escape LIKE special characters
    const escaped = q.replace(/[%_\\]/g, (match) => `\\${match}`);

    const results = await db.execute(sql`
      SELECT DISTINCT ON (${bookingsTable.customerName})
        ${bookingsTable.customerName} as "customerName",
        ${bookingsTable.phoneNumbers} as "phoneNumbers",
        ${bookingsTable.address} as "address"
      FROM ${bookingsTable}
      WHERE
        (${bookingsTable.customerName} ILIKE ${"%" + escaped + "%"}
        OR ${bookingsTable.phoneNumbers}::text ILIKE ${"%" + escaped + "%"})
        AND ${bookingsTable.adminId} = ${req.user!.adminId}
      LIMIT 10
    `);

    res.json(
      results.rows.map((r: any) => ({
        customerName: r.customerName,
        phoneNumbers: r.phoneNumbers as string[],
        address: r.address ?? null,
      }))
    );
  } catch (err) {
    logger.error({ err }, "GET /customers/search error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
