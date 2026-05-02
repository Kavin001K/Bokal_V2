import { Router } from "express";
import { generatePremiumBookingPdf, generateProfessionalReportPdf } from "../lib/pdf-generator.js";

const router = Router();

router.get("/pdf-test", async (_req, res) => {
  try {
    const pdfBytes = await generatePremiumBookingPdf({
      bookingRef: "MBK-TEST-2026",
      customerName: "Kavin Test User",
      phones: "+91 99999 88888",
      address: "Admin Test Office, Madurai",
      bookingDate: "2026-05-20",
      tamilDate: "Vaikasi 05",
      startTime: "10:00 AM",
      endTime: "08:00 PM",
      duration: "10",
      venues: [{ name: "Main Hall (Test)", price: "25,000" }],
      totalAmount: "25,000",
      advanceAmount: "10,000",
      isPaid: false,
      notes: "Test notes with special characters: # @ ! ? and emojis.",
      createdBy: "System Test",
      createdAt: new Date().toISOString(),
      business: {
        name: "MAHALBOOK TEST",
        tagline: "Ultra-Hardened PDF Engine",
        address: "Test Server, Madurai",
        phone: "+91 00000 00000",
        email: "test@bookal.app",
        gst: ""
      }
    });
    res.setHeader("Content-Type", "application/pdf");
    res.send(Buffer.from(pdfBytes));
  } catch (err) {
    res.status(500).json({ error: "Test PDF failed", details: String(err) });
  }
});

router.get("/report-test", async (_req, res) => {
  try {
    const pdfBytes = await generateProfessionalReportPdf({
      from: "2026-05-01",
      to: "2026-05-31",
      totalRevenue: "1,50,000",
      totalBookings: 12,
      avgValue: "12,500",
      byVenue: [
        { name: "Main Mahal", count: 8, revenue: "1,20,000" },
        { name: "Deluxe Room", count: 4, revenue: "30,000" }
      ],
      byEmployee: [
        { name: "Admin", count: 10, revenue: "1,40,000" },
        { name: "Staff 1", count: 2, revenue: "10,000" }
      ]
    });
    res.setHeader("Content-Type", "application/pdf");
    res.send(Buffer.from(pdfBytes));
  } catch (err) {
    res.status(500).json({ error: "Report Test failed", details: String(err) });
  }
});

export default router;
