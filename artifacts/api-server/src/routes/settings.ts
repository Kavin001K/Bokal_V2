import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, settingsTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/auth.js";

const router = Router();

router.get("/settings", requireAdmin, async (req, res) => {
  const settings = await db.select().from(settingsTable);
  const obj: Record<string, string> = {};
  for (const s of settings) {
    obj[s.key] = s.value;
  }
  res.json({
    default_duration_hours: obj["default_duration_hours"] ?? "4",
    session_timeout_hours: obj["session_timeout_hours"] ?? "24",
    rules_pdf_path: obj["rules_pdf_path"] ?? "",
  });
});

router.put("/settings", requireAdmin, async (req, res) => {
  const updates = req.body as Record<string, string>;
  for (const [key, value] of Object.entries(updates)) {
    await db
      .update(settingsTable)
      .set({ value: String(value), updatedAt: new Date() })
      .where(eq(settingsTable.key, key));
  }
  const settings = await db.select().from(settingsTable);
  const obj: Record<string, string> = {};
  for (const s of settings) {
    obj[s.key] = s.value;
  }
  res.json({
    default_duration_hours: obj["default_duration_hours"] ?? "4",
    session_timeout_hours: obj["session_timeout_hours"] ?? "24",
    rules_pdf_path: obj["rules_pdf_path"] ?? "",
  });
});

export default router;
