import { Router } from "express";
import { generatePremiumBookingPdf, mergePdfs } from "../lib/pdf-generator.js";
import { db, settingsTable, bookingsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { uploadToBucket, downloadFromBucket, getPublicUrl } from "../lib/supabase-storage.js";

const router = Router();

router.get("/merged-verify", async (_req, res) => {
  try {
    const lastBooking = await db.select().from(bookingsTable).orderBy(desc(bookingsTable.createdAt)).limit(1);
    
    const testData = {
      bookingRef: lastBooking[0]?.bookingRef || "BKL-VERIFY-001",
      customerName: lastBooking[0]?.customerName || "Verification User",
      phones: "9876543210",
      address: "Verification Address",
      bookingDate: "2026-05-15",
      tamilDate: "Vaikasi 01",
      startTime: "09:00 AM",
      endTime: "06:00 PM",
      duration: "9",
      venues: [{ name: "Main Mahal", price: "50,000" }],
      totalAmount: "50,000",
      advanceAmount: "10,000",
      isPaid: false,
      notes: "Verifying merged PDF output via BUCKET storage.",
      createdBy: "System",
      createdAt: new Date().toISOString(),
      business: {
        name: "BOOKAL",
        tagline: "Professional Hosting",
        address: "Tamil Nadu",
        phone: "",
        email: "",
        gst: ""
      }
    };

    const receiptPdf = await generatePremiumBookingPdf(testData);

    // Fetch actual rules from BUCKET
    const rulesSetting = await db.select().from(settingsTable).where(eq(settingsTable.key, "rules_pdf_path")).limit(1);
    
    let finalPdf = receiptPdf;
    let merged = false;

    if (rulesSetting.length > 0 && rulesSetting[0]!.value) {
      try {
        const rulesBuffer = await downloadFromBucket("pdfs", rulesSetting[0]!.value);
        finalPdf = await mergePdfs([receiptPdf, rulesBuffer]);
        merged = true;
      } catch (err) {
        console.error("Rules download failed for verify:", err);
      }
    }

    // Upload verification PDF to bucket
    const path = `verify/test_merged_${Date.now()}.pdf`;
    await uploadToBucket("pdfs", path, finalPdf);
    
    // Redirect to public URL of the uploaded file
    const publicUrl = getPublicUrl("pdfs", path);
    res.redirect(publicUrl);
  } catch (err) {
    res.status(500).json({ error: "Verification failed", details: String(err) });
  }
});

export default router;
