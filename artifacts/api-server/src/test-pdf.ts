import { generatePremiumBookingPdf, BookingPdfData } from "./lib/pdf-generator.js";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const testData: BookingPdfData = {
  bookingRef: "BKL-2026-0001",
  customerName: "Kavin",
  phones: "8825702072",
  address: "1/85 Zamin Kottampatti Samathur Pollachi",
  bookingDate: "02 May 2026",
  tamilDate: "19, 2057",
  startTime: "06:00",
  endTime: "14:00",
  duration: "8.00",
  venues: [
    { name: "Mahal", price: "16,000" }
  ],
  totalAmount: "16,000",
  advanceAmount: "16,000",
  isPaid: true,
  notes: "Test booking for UI verification.",
  createdBy: "Kavin K",
  createdAt: new Date().toISOString()
};

async function run() {
  console.log("Generating test PDF...");
  const pdfBytes = await generatePremiumBookingPdf(testData);
  const outPath = path.resolve(__dirname, "../test-receipt.pdf");
  writeFileSync(outPath, pdfBytes);
  console.log("Test PDF saved to:", outPath);
}

run().catch(console.error);
