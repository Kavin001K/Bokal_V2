import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, settingsTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/auth.js";
import { uploadToBucket, getPublicUrl } from "../lib/r2-storage.js";

const router = Router();

router.get("/settings", requireAdmin, async (req, res) => {
  const settings = await db.select().from(settingsTable).where(eq(settingsTable.adminId, req.user!.adminId));
  const obj: Record<string, string> = {};
  for (const s of settings) {
    obj[s.key] = s.value;
  }
  res.json({
    default_duration_hours: obj["default_duration_hours"] ?? "4",
    session_timeout_hours: obj["session_timeout_hours"] ?? "24",
    rules_pdf_path: obj["rules_pdf_path"] ?? "",
    biz_name: obj["biz_name"] ?? "",
    biz_tagline: obj["biz_tagline"] ?? "",
    biz_address: obj["biz_address"] ?? "",
    biz_phone: obj["biz_phone"] ?? "",
    biz_email: obj["biz_email"] ?? "",
    biz_gst: obj["biz_gst"] ?? "",
  });
});

const ALLOWED_SETTINGS_KEYS = new Set([
  "default_duration_hours", "session_timeout_hours", "rules_pdf_path",
  "biz_name", "biz_tagline", "biz_address", "biz_phone", "biz_email", "biz_gst",
]);

router.put("/settings", requireAdmin, async (req, res) => {
  const updates = req.body as Record<string, string>;
  for (const [key, value] of Object.entries(updates)) {
    if (!ALLOWED_SETTINGS_KEYS.has(key)) continue; // Skip unknown keys
    await db
      .insert(settingsTable)
      .values({ key, value: String(value), adminId: req.user!.adminId })
      .onConflictDoUpdate({
        target: [settingsTable.adminId, settingsTable.key],
        set: { value: String(value), updatedAt: new Date() },
      });
  }
  const settings = await db.select().from(settingsTable).where(eq(settingsTable.adminId, req.user!.adminId));
  const obj: Record<string, string> = {};
  for (const s of settings) {
    obj[s.key] = s.value;
  }
  res.json({
    default_duration_hours: obj["default_duration_hours"] ?? "4",
    session_timeout_hours: obj["session_timeout_hours"] ?? "24",
    rules_pdf_path: obj["rules_pdf_path"] ?? "",
    biz_name: obj["biz_name"] ?? "",
    biz_tagline: obj["biz_tagline"] ?? "",
    biz_address: obj["biz_address"] ?? "",
    biz_phone: obj["biz_phone"] ?? "",
    biz_email: obj["biz_email"] ?? "",
    biz_gst: obj["biz_gst"] ?? "",
  });
});

router.post("/settings/rules-pdf", requireAdmin, async (req, res) => {
  const { pdfData } = req.body as { pdfData: string };
  if (!pdfData) {
    res.status(400).json({ message: "No PDF data provided" });
    return;
  }

  try {
    const base64 = pdfData.replace(/^data:application\/pdf;base64,/, "");
    const buffer = Buffer.from(base64, "base64");
    const fileName = "venue_rules.pdf";
    const path = `companies/${req.user!.adminId}/rules/${fileName}`;

    await uploadToBucket("pdfs", path, buffer);

    await db
      .insert(settingsTable)
      .values({
        key: "rules_pdf_path",
        value: path,
        adminId: req.user!.adminId,
      })
      .onConflictDoUpdate({
        target: [settingsTable.adminId, settingsTable.key],
        set: { value: path, updatedAt: new Date() },
      });

    res.json({ message: "Rules PDF uploaded to bucket successfully", rules_pdf_path: path });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to upload to storage", details: err.message });
  }
});

router.get("/settings/rules-pdf", requireAdmin, async (req, res) => {
  const setting = await db.select().from(settingsTable).where(and(eq(settingsTable.key, "rules_pdf_path"), eq(settingsTable.adminId, req.user!.adminId))).limit(1);
  if (!setting.length || !setting[0]!.value) {
    res.status(404).json({ message: "No rules PDF found" });
    return;
  }

  const publicUrl = await getPublicUrl("pdfs", setting[0]!.value);
  res.redirect(publicUrl);
});

export default router;
