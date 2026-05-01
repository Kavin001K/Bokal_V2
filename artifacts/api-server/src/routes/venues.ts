import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, venuesTable } from "@workspace/db";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";

const router = Router();

router.get("/venues", requireAuth, async (req, res) => {
  const venues = await db
    .select()
    .from(venuesTable)
    .where(eq(venuesTable.isActive, true))
    .orderBy(venuesTable.displayOrder);

  res.json(
    venues.map((v) => ({
      id: v.id,
      name: v.name,
      type: v.type,
      pricePerHour: Number(v.pricePerHour),
      isActive: v.isActive,
      displayOrder: v.displayOrder,
    }))
  );
});

router.put("/venues/:id/price", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { pricePerHour } = req.body as { pricePerHour: number };

  if (!pricePerHour || pricePerHour < 0) {
    res.status(400).json({ error: "Invalid price" });
    return;
  }

  await db
    .update(venuesTable)
    .set({ pricePerHour: String(pricePerHour) })
    .where(eq(venuesTable.id, id!));

  const venue = await db
    .select()
    .from(venuesTable)
    .where(eq(venuesTable.id, id!))
    .limit(1);

  if (!venue[0]) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  res.json({
    id: venue[0].id,
    name: venue[0].name,
    type: venue[0].type,
    pricePerHour: Number(venue[0].pricePerHour),
    isActive: venue[0].isActive,
    displayOrder: venue[0].displayOrder,
  });
});

export default router;
