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
    biz_name: obj["biz_name"] ?? "",
    biz_tagline: obj["biz_tagline"] ?? "",
    biz_address: obj["biz_address"] ?? "",
    biz_phone: obj["biz_phone"] ?? "",
    biz_email: obj["biz_email"] ?? "",
    biz_gst: obj["biz_gst"] ?? "",
  });
});

router.put("/settings", requireAdmin, async (req, res) => {
  const updates = req.body as Record<string, string>;
  for (const [key, value] of Object.entries(updates)) {
    await db
      .insert(settingsTable)
      .values({ key, value: String(value) })
      .onConflictDoUpdate({
        target: settingsTable.key,
        set: { value: String(value), updatedAt: new Date() },
      });
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

router.post("/settings/rules-pdf", requireAdmin, async (req, res) => {
  const { pdfData } = req.body as { pdfData: string };
  if (!pdfData) {
    res.status(400).json({ message: "No PDF data provided" });
    return;
  }

  // Remove data URI prefix if present
  const base64 = pdfData.replace(/^data:application\/pdf;base64,/, "");

  await db
    .insert(settingsTable)
    .values({
      key: "rules_pdf_data",
      value: base64,
    })
    .onConflictDoUpdate({
      target: settingsTable.key,
      set: { value: base64, updatedAt: new Date() },
    });

  // Also update the path setting to indicate a file is uploaded
  await db
    .insert(settingsTable)
    .values({
      key: "rules_pdf_path",
      value: "rules_v2.pdf",
    })
    .onConflictDoUpdate({
      target: settingsTable.key,
      set: { value: "rules_v2.pdf", updatedAt: new Date() },
    });

  res.json({ message: "Rules PDF uploaded successfully", rules_pdf_path: "rules_v2.pdf" });
});

router.get("/settings/rules-pdf", requireAdmin, async (req, res) => {
  const setting = await db.select().from(settingsTable).where(eq(settingsTable.key, "rules_pdf_data")).limit(1);
  if (!setting.length || !setting[0]!.value) {
    res.status(404).json({ message: "No rules PDF found" });
    return;
  }

  const pdfBuffer = Buffer.from(setting[0]!.value, "base64");
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="rules_v2.pdf"`);
  res.send(pdfBuffer);
});

export default router;
