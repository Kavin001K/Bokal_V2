import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, venuesTable } from "@workspace/db";
import { firstString } from "../lib/express-utils.js";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";

const router = Router();

router.get("/venues", requireAuth, async (req, res) => {
  try {
    console.log(`!!! FETCH VENUES - User: ${req.user?.email}, AdminId: ${req.user?.adminId}`);
    
    // Admins see all venues by default; others see only active ones unless 'all=true'
    const isAdmin = req.user?.role === "admin";
    const showAll = req.query["all"] === "true" || isAdmin;
    
    let conditions = eq(venuesTable.adminId, req.user!.adminId);
    
    if (!showAll) {
      conditions = and(conditions, eq(venuesTable.isActive, true)) as any;
    }
    
    const venues = await db.select().from(venuesTable)
      .where(conditions)
      .orderBy(venuesTable.displayOrder);

    res.json(
      venues.map((v) => ({
        ...v,
        pricePerHour: Number(v.pricePerHour),
      }))
    );
  } catch (err) {
    console.error("GET /venues error:", err);
    res.status(500).json({ error: "Failed to fetch venues" });
  }
});

router.post("/venues", requireAdmin, async (req, res) => {
  try {
    console.log(`!!! CREATE VENUE - User: ${req.user?.email}, AdminId: ${req.user?.adminId}`);
    
    if (!req.user?.adminId) {
      console.error("CRITICAL: Missing adminId in request context!");
      res.status(403).json({ error: "Access Denied", message: "Your account is not linked to a Mahal Admin. Please log out and back in." });
      return;
    }

    const { name, type, venueCategory, amenities, colorTag, pricePerHour, displayOrder } = req.body;

    if (!name || !type) {
      res.status(400).json({ error: "Name and type are required" });
      return;
    }

    const [newVenue] = await db.insert(venuesTable).values({
      name,
      type,
      venueCategory: venueCategory || "other",
      amenities: amenities || [],
      colorTag: colorTag || "#C75B2A",
      pricePerHour: String(pricePerHour || 0),
      displayOrder: displayOrder || 0,
      isActive: true,
      adminId: req.user!.adminId,
    }).returning();

    res.status(201).json({
      ...newVenue,
      pricePerHour: Number(newVenue.pricePerHour),
    });
  } catch (err) {
    console.error("POST /venues error:", err);
    res.status(500).json({ error: "Failed to create venue", message: err instanceof Error ? err.message : "Database error" });
  }
});

router.put("/venues/:id", requireAdmin, async (req, res) => {
  try {
    console.log(`!!! UPDATE VENUE - User: ${req.user?.email}, AdminId: ${req.user?.adminId}`);
    const id = firstString(req.params.id);
    const { name, type, venueCategory, amenities, colorTag, pricePerHour, displayOrder, isActive } = req.body;

    if (!id) {
      res.status(400).json({ error: "Venue ID is required" });
      return;
    }

    const [updatedVenue] = await db.update(venuesTable)
      .set({
        name,
        type,
        venueCategory,
        amenities,
        colorTag,
        pricePerHour: pricePerHour !== undefined ? String(pricePerHour) : undefined,
        displayOrder,
        isActive,
      })
      .where(and(eq(venuesTable.id, id), eq(venuesTable.adminId, req.user!.adminId)))
      .returning();

    if (!updatedVenue) {
      res.status(404).json({ error: "Not found", message: "Venue not found or access denied" });
      return;
    }

    res.json({
      ...updatedVenue,
      pricePerHour: Number(updatedVenue.pricePerHour),
    });
  } catch (err) {
    console.error("PUT /venues/:id error:", err);
    res.status(500).json({ error: "Failed to update venue" });
  }
});

router.put("/venues/:id/price", requireAdmin, async (req, res) => {
  try {
    const id = firstString(req.params.id);
    const { pricePerHour } = req.body as { pricePerHour: number };

    if (!id) {
      res.status(400).json({ error: "Venue ID is required" });
      return;
    }

    if (pricePerHour === undefined || pricePerHour === null || pricePerHour < 0 || isNaN(pricePerHour)) {
      res.status(400).json({ error: "Invalid price" });
      return;
    }

    const [venue] = await db
      .update(venuesTable)
      .set({ pricePerHour: String(pricePerHour) })
      .where(and(eq(venuesTable.id, id), eq(venuesTable.adminId, req.user!.adminId)))
      .returning();

    if (!venue) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    res.json({
      ...venue,
      pricePerHour: Number(venue.pricePerHour),
    });
  } catch (err) {
    console.error("PUT /venues/:id/price error:", err);
    res.status(500).json({ error: "Failed to update price" });
  }
});

router.delete("/venues/:id", requireAdmin, async (req, res) => {
  try {
    console.log(`!!! DELETE VENUE - User: ${req.user?.email}, AdminId: ${req.user?.adminId}`);
    const id = firstString(req.params.id);

    if (!id) {
      res.status(400).json({ error: "Venue ID is required" });
      return;
    }

    // Soft delete
    const [deletedVenue] = await db.update(venuesTable)
      .set({ isActive: false })
      .where(and(eq(venuesTable.id, id), eq(venuesTable.adminId, req.user!.adminId)))
      .returning();

    if (!deletedVenue) {
      res.status(404).json({ error: "Not found", message: "Venue not found or access denied" });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /venues/:id error:", err);
    res.status(500).json({ error: "Failed to delete venue" });
  }
});

export default router;
