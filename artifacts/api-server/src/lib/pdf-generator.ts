/**
 * Professional PDF Generator for Bookal using pdf-lib.
 * Generates a branded, high-fidelity receipt and terms & conditions.
 */
import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont, RGB } from "pdf-lib";

export interface BusinessInfo {
  name: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  gst: string;
}

export interface ReportPdfData {
  from: string;
  to: string;
  totalRevenue: string;
  totalBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  avgValue: string;
  byVenue: { name: string; revenue: string; count: number }[];
  byEmployee: { name: string; revenue: string; count: number }[];
  business?: BusinessInfo;
}

export interface BookingPdfData {
  bookingRef: string;
  customerName: string;
  phones: string;
  address: string;
  bookingDate: string;
  tamilDate: string;
  startTime: string;
  endTime: string;
  duration: string;
  venues: { name: string; price: string }[];
  totalAmount: string;
  advanceAmount: string;
  isPaid: boolean;
  notes?: string;
  createdBy: string;
  createdAt: string;
  business?: BusinessInfo;
}

// ─── Design Tokens ──────────────────────────────────────────────────────────
const COLORS = {
  PRIMARY: rgb(0.49, 0.21, 0.09),   // #7C3518 (Deep Coffee/Brown)
  ACCENT: rgb(0.78, 0.36, 0.16),    // #C75B2A (Branding Orange)
  SECONDARY: rgb(0.95, 0.61, 0.45), // Lighter Terracotta
  TEXT_DARK: rgb(0.10, 0.07, 0.04), // Off-black
  TEXT_MUTED: rgb(0.42, 0.34, 0.27),// Earthy Grey
  BORDER: rgb(0.91, 0.87, 0.83),    // Stone Grey
  WHITE: rgb(1, 1, 1),
  BG_LIGHT: rgb(0.99, 0.97, 0.95),  // Cream White
  SUCCESS: rgb(0.1, 0.6, 0.2)       // Forest Green
};

const MARGIN = 45;
const WIDTH = 595.28; // A4 Width
const HEIGHT = 841.89; // A4 Height

// ─── Utilities ──────────────────────────────────────────────────────────────

function cleanText(text: string | null | undefined): string {
  if (!text) return "";
  // Remove non-standard characters that Helvetica can't render
  return text.toString().replace(/[^\x20-\x7E]/g, "");
}

function wrapText(text: string, maxWidth: number, font: PDFFont, fontSize: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(testLine, fontSize);
    if (width <= maxWidth) {
      currentLine = testLine;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

function drawLine(page: PDFPage, x1: number, y1: number, x2: number, y2: number, thickness = 0.5, color = COLORS.BORDER) {
  page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness, color });
}

function drawIcon(page: PDFPage, type: string, x: number, y: number, size: number, color = COLORS.WHITE) {
  const s = size;
  const h = s / 2;
  
  if (type === "user") {
    page.drawCircle({ x, y: y + s/4, size: s/4, color });
    page.drawEllipse({ x, y: y - s/4, xScale: s/2, yScale: s/4, color });
  } else if (type === "calendar") {
    page.drawRectangle({ x: x - h, y: y - h, width: s, height: s, borderColor: color, borderWidth: 1.2 });
    page.drawLine({ start: { x: x - h, y: y + h - 3 }, end: { x: x + h, y: y + h - 3 }, thickness: 1.2, color });
    page.drawRectangle({ x: x - h + 2, y: y + h - 1, width: 2, height: 3, color });
    page.drawRectangle({ x: x + h - 4, y: y + h - 1, width: 2, height: 3, color });
  } else if (type === "building") {
    page.drawRectangle({ x: x - h, y: y - h, width: s, height: s, borderColor: color, borderWidth: 1.2 });
    page.drawRectangle({ x: x - 2, y: y - h, width: 4, height: 6, color });
  } else if (type === "document") {
    page.drawRectangle({ x: x - h + 2, y: y - h, width: s - 4, height: s, borderColor: color, borderWidth: 1.2 });
    page.drawLine({ start: { x: x - 2, y: y + 2 }, end: { x: x + 2, y: y + 2 }, thickness: 1, color });
    page.drawLine({ start: { x: x - 2, y: y }, end: { x: x + 2, y: y }, thickness: 1, color });
  } else if (type === "pin") {
    page.drawCircle({ x, y: y + 2, size: s/3, borderColor: color, borderWidth: 1.2 });
    page.drawLine({ start: { x, y: y - h }, end: { x, y: y + 2 }, thickness: 1.2, color });
  } else if (type === "phone") {
    page.drawRectangle({ x: x - 3, y: y - h, width: 6, height: s, borderColor: color, borderWidth: 1, borderRadius: 1 });
  } else if (type === "mail") {
    page.drawRectangle({ x: x - h, y: y - 3, width: s, height: s - 3, borderColor: color, borderWidth: 1.2 });
    page.drawLine({ start: { x: x - h, y: y + h - 3 }, end: { x: x, y: y - 1 }, thickness: 1, color });
    page.drawLine({ start: { x: x + h, y: y + h - 3 }, end: { x: x, y: y - 1 }, thickness: 1, color });
  } else if (type === "crown") {
    page.drawLine({ start: { x: x - h, y: y - h + 2 }, end: { x: x + h, y: y - h + 2 }, thickness: 1.2, color });
    page.drawLine({ start: { x: x - h, y: y - h + 2 }, end: { x: x - h, y: y + h - 2 }, thickness: 1.2, color });
    page.drawLine({ start: { x: x + h, y: y - h + 2 }, end: { x: x + h, y: y + h - 2 }, thickness: 1.2, color });
    page.drawLine({ start: { x: x - h, y: y + h - 2 }, end: { x: x, y: y }, thickness: 1.2, color });
    page.drawLine({ start: { x: x, y: y }, end: { x: x + h, y: y + h - 2 }, thickness: 1.2, color });
  } else if (type === "shield") {
    page.drawLine({ start: { x: x - h, y: y + h }, end: { x: x + h, y: y + h }, thickness: 1.2, color });
    page.drawLine({ start: { x: x - h, y: y + h }, end: { x: x - h, y: y }, thickness: 1.2, color });
    page.drawLine({ start: { x: x + h, y: y + h }, end: { x: x + h, y: y }, thickness: 1.2, color });
    page.drawLine({ start: { x: x - h, y: y }, end: { x: x, y: y - h }, thickness: 1.2, color });
    page.drawLine({ start: { x: x, y: y - h }, end: { x: x + h, y: y }, thickness: 1.2, color });
  } else if (type === "clock") {
    page.drawCircle({ x, y, size: h, borderColor: color, borderWidth: 1.2 });
    page.drawLine({ start: { x, y }, end: { x, y: y + h - 3 }, thickness: 1.2, color });
    page.drawLine({ start: { x, y }, end: { x + h - 4, y }, thickness: 1.2, color });
  }
}

function drawSectionHeader(page: PDFPage, text: string, icon: string, x: number, y: number, font: PDFFont) {
  page.drawCircle({ x: x + 15, y: y + 5, size: 12, color: COLORS.ACCENT });
  drawIcon(page, icon, x + 15, y + 5, 10, COLORS.WHITE);
  page.drawText(text, { x: x + 35, y, size: 12, font, color: COLORS.ACCENT });
  drawLine(page, x + 35, y - 8, x + 250, y - 8, 1, COLORS.BORDER);
}

// ─── Main Generator ─────────────────────────────────────────────────────────

export async function generateBookingConfirmationPdf(data: BookingPdfData): Promise<Uint8Array> {
  try {
    const pdfDoc = await PDFDocument.create();
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const biz = data.business || {
      name: "BOOKAL",
      tagline: "Excellence in Event",
      address: "1/85 Zamin Kottampatti, Pollachi, TN 642123",
      phone: "+91 88257 02072",
      email: "bookings@bookal.app",
      gst: "33AAAAA0000A1Z5"
    };

    // ─── PAGE 1: BOOKING RECEIPT ─────────────────────────────────────────────
    let page = pdfDoc.addPage([WIDTH, HEIGHT]);
    let y = HEIGHT;

    const drawHeader = (p: PDFPage) => {
      // Main Brown Header
      p.drawRectangle({ x: 0, y: HEIGHT - 180, width: WIDTH, height: 180, color: COLORS.PRIMARY });
      
      // Glassy decorative waves
      [0.15, 0.08, 0.05].forEach((op, i) => {
        p.drawEllipse({
          x: WIDTH - (20 * i),
          y: HEIGHT - (10 * i),
          xScale: 300 - (i * 40),
          yScale: 250 - (i * 30),
          color: COLORS.WHITE,
          opacity: op
        });
      });

      // Logo Area
      const logoX = MARGIN + 10;
      const logoY = HEIGHT - 85;
      
      // Hexagon Logo Shape
      const s = 24;
      const c30 = 0.866;
      const s30 = 0.5;
      const points = [
        { x: logoX, y: logoY + s },
        { x: logoX + s * c30, y: logoY + s * s30 },
        { x: logoX + s * c30, y: logoY - s * s30 },
        { x: logoX, y: logoY - s },
        { x: logoX - s * c30, y: logoY - s * s30 },
        { x: logoX - s * c30, y: logoY + s * s30 }
      ];
      for (let i = 0; i < 6; i++) {
        p.drawLine({ start: points[i], end: points[(i+1)%6], thickness: 2.5, color: COLORS.WHITE });
      }
      p.drawText("B", { x: logoX - 8, y: logoY - 8, size: 24, font: bold, color: COLORS.WHITE });

      // Brand Name
      p.drawText(cleanText(biz.name), { x: logoX + 55, y: HEIGHT - 90, size: 42, font: bold, color: COLORS.WHITE });
      p.drawText(cleanText(biz.tagline), { x: logoX + 58, y: HEIGHT - 110, size: 14, font: regular, color: COLORS.WHITE });

      // Business Details (Right)
      let bizY = HEIGHT - 50;
      const drawBizInfo = (text: string, icon: string) => {
        if (!text) return;
        drawIcon(p, icon, WIDTH - 220, bizY + 4, 11, COLORS.ACCENT);
        p.drawText(cleanText(text), { x: WIDTH - 205, y: bizY, size: 9.5, font: regular, color: COLORS.WHITE });
        bizY -= 18;
      };
      drawBizInfo(biz.address, "pin");
      drawBizInfo(biz.phone, "phone");
      drawBizInfo(biz.email, "mail");
      if (biz.gst) drawBizInfo(`GST: ${biz.gst}`, "document");

      // Ref Badge
      const refText = `REF: ${data.bookingRef}`;
      const refW = bold.widthOfTextAtSize(refText, 11);
      p.drawRectangle({ x: WIDTH - MARGIN - refW - 24, y: HEIGHT - 155, width: refW + 24, height: 26, color: COLORS.ACCENT, borderRadius: 4 });
      p.drawText(refText, { x: WIDTH - MARGIN - refW - 12, y: HEIGHT - 147, size: 11, font: bold, color: COLORS.WHITE });
    };

    const drawFooter = (p: PDFPage, pageNum: number) => {
      p.drawRectangle({ x: MARGIN, y: 20, width: WIDTH - MARGIN * 2, height: 30, color: COLORS.BG_LIGHT, borderRadius: 8 });
      p.drawText(`Page ${pageNum}`, { x: WIDTH / 2 - 20, y: 30, size: 9, font: regular, color: COLORS.TEXT_MUTED });
      p.drawText(`Generated: ${new Date().toLocaleDateString()}`, { x: MARGIN + 15, y: 30, size: 8, font: regular, color: COLORS.TEXT_MUTED });
      p.drawText("Bookal Management System", { x: WIDTH - MARGIN - 120, y: 30, size: 8, font: regular, color: COLORS.TEXT_MUTED });
    };

    drawHeader(page);
    y = HEIGHT - 220;

    // Title
    const title = "BOOKING CONFIRMATION RECEIPT";
    const titleW = bold.widthOfTextAtSize(title, 24);
    page.drawText(title, { x: (WIDTH - titleW) / 2, y, size: 24, font: bold, color: COLORS.TEXT_DARK });
    y -= 10;
    drawLine(page, WIDTH/2 - 40, y, WIDTH/2 + 40, y, 2, COLORS.ACCENT);
    y -= 45;

    // Information Grid
    const colW = (WIDTH - MARGIN * 2 - 30) / 2;
    const cardH = 150;

    // Card 1: Client
    page.drawRectangle({ x: MARGIN, y: y - cardH, width: colW, height: cardH, color: COLORS.WHITE, borderColor: COLORS.BORDER, borderWidth: 1, borderRadius: 10 });
    drawSectionHeader(page, "CLIENT INFORMATION", "user", MARGIN + 10, y - 5, bold);
    
    let cardY = y - 40;
    const drawRow = (p: PDFPage, label: string, val: string, lx: number, rx: number) => {
      p.drawText(label, { x: lx, y: cardY, size: 10, font: regular, color: COLORS.TEXT_MUTED });
      p.drawText(cleanText(val), { x: rx, y: cardY, size: 10.5, font: bold, color: COLORS.TEXT_DARK });
      cardY -= 22;
    };
    
    drawRow(page, "Name", data.customerName, MARGIN + 25, MARGIN + 85);
    drawRow(page, "Phone", data.phones, MARGIN + 25, MARGIN + 85);
    page.drawText("Address", { x: MARGIN + 25, y: cardY, size: 10, font: regular, color: COLORS.TEXT_MUTED });
    const addrLines = wrapText(data.address, colW - 95, regular, 10);
    addrLines.slice(0, 3).forEach((l, i) => {
      page.drawText(cleanText(l), { x: MARGIN + 85, y: cardY - (i * 14), size: 10, font: bold, color: COLORS.TEXT_DARK });
    });

    // Card 2: Schedule
    const col2X = MARGIN + colW + 30;
    page.drawRectangle({ x: col2X, y: y - cardH, width: colW, height: cardH, color: COLORS.WHITE, borderColor: COLORS.BORDER, borderWidth: 1, borderRadius: 10 });
    drawSectionHeader(page, "EVENT SCHEDULE", "calendar", col2X + 10, y - 5, bold);
    
    cardY = y - 40;
    drawRow(page, "Date", data.bookingDate, col2X + 25, col2X + 95);
    drawRow(page, "Tamil Date", data.tamilDate || "N/A", col2X + 25, col2X + 95);
    drawRow(page, "Time", `${data.startTime} - ${data.endTime}`, col2X + 25, col2X + 95);
    drawRow(page, "Duration", `${data.duration} hours`, col2X + 25, col2X + 95);

    y -= (cardH + 40);

    // Venue & Pricing Table
    drawSectionHeader(page, "VENUE & PRICING", "building", MARGIN, y + 5, bold);
    y -= 30;

    // Table Header
    page.drawRectangle({ x: MARGIN, y: y - 25, width: WIDTH - MARGIN * 2, height: 25, color: COLORS.BG_LIGHT, borderRadius: 5 });
    page.drawText("Description / Venue Name", { x: MARGIN + 15, y: y - 17, size: 10, font: bold, color: COLORS.ACCENT });
    page.drawText("Subtotal (Rs.)", { x: WIDTH - MARGIN - 100, y: y - 17, size: 10, font: bold, color: COLORS.ACCENT });
    y -= 35;

    data.venues.forEach((v, i) => {
      // Check for page overflow
      if (y < 180) {
        drawFooter(page, 1);
        page = pdfDoc.addPage([WIDTH, HEIGHT]);
        drawHeader(page);
        y = HEIGHT - 220;
        // Repeat table header
        page.drawRectangle({ x: MARGIN, y: y - 25, width: WIDTH - MARGIN * 2, height: 25, color: COLORS.BG_LIGHT, borderRadius: 5 });
        page.drawText("Description / Venue Name", { x: MARGIN + 15, y: y - 17, size: 10, font: bold, color: COLORS.ACCENT });
        page.drawText("Subtotal (Rs.)", { x: WIDTH - MARGIN - 100, y: y - 17, size: 10, font: bold, color: COLORS.ACCENT });
        y -= 35;
      }

      if (i % 2 === 1) {
        page.drawRectangle({ x: MARGIN + 5, y: y - 8, width: WIDTH - MARGIN * 2 - 10, height: 22, color: COLORS.BG_LIGHT, opacity: 0.5 });
      }
      page.drawText(cleanText(v.name), { x: MARGIN + 15, y, size: 11, font: regular, color: COLORS.TEXT_DARK });
      const pText = `Rs. ${v.price}`;
      const pw = bold.widthOfTextAtSize(pText, 11);
      page.drawText(pText, { x: WIDTH - MARGIN - pw - 15, y, size: 11, font: bold, color: COLORS.TEXT_DARK });
      y -= 25;
      drawLine(page, MARGIN + 15, y + 20, WIDTH - MARGIN - 15, y + 20, 0.5, COLORS.BORDER);
    });

    // Totals Block
    y -= 20;
    if (y < 220) {
      drawFooter(page, 1);
      page = pdfDoc.addPage([WIDTH, HEIGHT]);
      drawHeader(page);
      y = HEIGHT - 220;
    }

    const totalBoxH = 100;
    page.drawRectangle({ x: MARGIN, y: y - totalBoxH, width: WIDTH - MARGIN * 2, height: totalBoxH, color: COLORS.WHITE, borderColor: COLORS.ACCENT, borderWidth: 1.5, borderRadius: 12 });
    
    // Left side: Advance & Balance
    const totalVal = parseFloat(data.totalAmount.replace(/,/g, '')) || 0;
    const advVal = parseFloat(data.advanceAmount.replace(/,/g, '')) || 0;
    const balVal = totalVal - advVal;

    page.drawText("Summary", { x: MARGIN + 25, y: y - 25, size: 12, font: bold, color: COLORS.TEXT_DARK });
    page.drawText(`Advance Paid: Rs. ${data.advanceAmount}`, { x: MARGIN + 25, y: y - 45, size: 11, font: regular, color: COLORS.TEXT_MUTED });
    page.drawText(`Balance Due: Rs. ${balVal.toLocaleString()}`, { x: MARGIN + 25, y: y - 65, size: 13, font: bold, color: COLORS.ACCENT });

    // Right side: Grand Total
    const gt = `Rs. ${data.totalAmount}`;
    const gtW = bold.widthOfTextAtSize(gt, 42);
    page.drawText("GRAND TOTAL", { x: WIDTH - MARGIN - gtW - 10, y: y - 35, size: 14, font: bold, color: COLORS.TEXT_DARK });
    page.drawText(gt, { x: WIDTH - MARGIN - gtW - 10, y: y - 80, size: 42, font: bold, color: COLORS.PRIMARY });

    y -= (totalBoxH + 40);

    // Signatures
    const sigW = 180;
    drawLine(page, MARGIN + 10, y + 20, MARGIN + sigW, y + 20, 1, COLORS.TEXT_DARK);
    page.drawText("Customer Signature", { x: MARGIN + 35, y: y + 5, size: 10, font: regular, color: COLORS.TEXT_MUTED });

    // Official Seal
    const sealX = WIDTH / 2;
    const sealY = y + 25;
    page.drawCircle({ x: sealX, y: sealY, size: 28, borderColor: COLORS.ACCENT, borderWidth: 1, opacity: 0.5 });
    page.drawCircle({ x: sealX, y: sealY, size: 24, borderColor: COLORS.ACCENT, borderWidth: 2 });
    drawIcon(page, "crown", sealX, sealY, 15, COLORS.ACCENT);

    const authX = WIDTH - MARGIN - sigW;
    drawLine(page, authX, y + 20, WIDTH - MARGIN - 10, y + 20, 1, COLORS.TEXT_DARK);
    page.drawText("Authorized Seal & Sign", { x: authX + 25, y: y + 5, size: 10, font: regular, color: COLORS.TEXT_MUTED });

    drawFooter(page, 1);

    // ─── PAGE 2: TERMS & CONDITIONS ──────────────────────────────────────────
    const termsPage = pdfDoc.addPage([WIDTH, HEIGHT]);
    drawHeader(termsPage);
    let ty = HEIGHT - 220;

    const tTitle = "TERMS & CONDITIONS";
    const ttW = bold.widthOfTextAtSize(tTitle, 22);
    termsPage.drawText(tTitle, { x: (WIDTH - ttW) / 2, y: ty, size: 22, font: bold, color: COLORS.TEXT_DARK });
    ty -= 40;

    const TERMS = [
      {
        title: "1. BOOKING & CONFIRMATION",
        items: [
          "Booking is confirmed only upon receipt of the specified advance amount.",
          "The venue and services are reserved exclusively for the dates/times mentioned.",
          "Any requested changes must be submitted in writing at least 15 days prior."
        ]
      },
      {
        title: "2. PAYMENT POLICY",
        items: [
          "The total balance must be cleared on or before the event date.",
          "Payments can be made via Cash, UPI, or Bank Transfer as per system records.",
          "Late payments may incur a penalty or lead to service restriction."
        ]
      },
      {
        title: "3. CANCELLATION & REFUNDS",
        items: [
          "Advance payments are strictly non-refundable.",
          "Cancellations within 7 days of the event will attract 100% of the total bill.",
          "In case of government-imposed lockdowns, dates can be rescheduled for free."
        ]
      },
      {
        title: "4. VENUE RULES",
        items: [
          "Smoking and illegal substances are strictly prohibited inside the premises.",
          "The customer is responsible for any damage caused to furniture or property.",
          "Loud music must stop by 10:00 PM as per local government regulations."
        ]
      }
    ];

    TERMS.forEach(section => {
      termsPage.drawText(section.title, { x: MARGIN + 10, y: ty, size: 13, font: bold, color: COLORS.ACCENT });
      ty -= 20;
      section.items.forEach(item => {
        termsPage.drawCircle({ x: MARGIN + 25, y: ty + 3, size: 2, color: COLORS.ACCENT });
        const lines = wrapText(item, WIDTH - MARGIN * 2 - 50, regular, 11);
        lines.forEach(line => {
          termsPage.drawText(cleanText(line), { x: MARGIN + 35, y: ty, size: 11, font: regular, color: COLORS.TEXT_DARK });
          ty -= 18;
        });
      });
      ty -= 10;
    });

    drawFooter(termsPage, 2);

    return pdfDoc.save();
  } catch (err) {
    console.error("PDF Redesign Error:", err);
    // Safe Fallback
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const p = doc.addPage([WIDTH, HEIGHT]);
    p.drawText("BOOKAL SYSTEM RECOVERY: RECEIPT GENERATED", { x: 50, y: 800, size: 14, font });
    return doc.save();
  }
}

/**
 * Generates the executive Financial Report PDF.
 */
export async function generateProfessionalReportPdf(data: ReportPdfData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const page = pdfDoc.addPage([WIDTH, HEIGHT]);
  const margin = MARGIN;
  const rightEdge = WIDTH - margin;

  // Header
  page.drawRectangle({ x: 0, y: HEIGHT - 80, width: WIDTH, height: 80, color: COLORS.PRIMARY });
  page.drawText("EXECUTIVE PERFORMANCE REPORT", { x: margin, y: HEIGHT - 45, size: 20, font: bold, color: COLORS.WHITE });
  page.drawText(`${data.from} to ${data.to}`, { x: margin, y: HEIGHT - 65, size: 10, font: regular, color: COLORS.WHITE });

  let y = HEIGHT - 120;

  // Summary Grid
  page.drawText("PERFORMANCE SUMMARY", { x: margin, y, size: 10, font: bold, color: COLORS.PRIMARY });
  y -= 25;

  const colWidth = (WIDTH - margin * 2) / 3;
  
  // Stats Row
  const drawStat = (label: string, val: string, x: number) => {
    page.drawText(label, { x, y, size: 9, font: regular, color: COLORS.TEXT_MUTED });
    page.drawText(cleanText(val), { x, y: y - 18, size: 14, font: bold, color: COLORS.TEXT_DARK });
  };
  
  drawStat("Total Revenue", `Rs. ${data.totalRevenue}`, margin);
  drawStat("Total Bookings", `${data.totalBookings}`, margin + colWidth);
  drawStat("Avg. Booking", `Rs. ${data.avgValue}`, margin + colWidth * 2);

  y -= 50;
  
  // Revenue by Venue
  page.drawText("REVENUE BY VENUE", { x: margin, y, size: 10, font: bold, color: COLORS.PRIMARY });
  y -= 5;
  drawLine(page, margin, y, rightEdge, y, 0.5);
  y -= 18;
  page.drawText("Venue Name", { x: margin, y, size: 9, font: bold, color: COLORS.TEXT_MUTED });
  page.drawText("Bookings", { x: margin + 250, y, size: 9, font: bold, color: COLORS.TEXT_MUTED });
  page.drawText("Revenue", { x: rightEdge - 80, y, size: 9, font: bold, color: COLORS.TEXT_MUTED });
  
  for (const v of data.byVenue) {
    y -= 20;
    page.drawText(cleanText(v.name), { x: margin, y, size: 10, font: regular, color: COLORS.TEXT_DARK });
    page.drawText(cleanText(`${v.count}`), { x: margin + 250, y, size: 10, font: regular, color: COLORS.TEXT_DARK });
    const revLabel = cleanText(`Rs. ${v.revenue}`);
    const revW = bold.widthOfTextAtSize(revLabel, 10);
    page.drawText(revLabel, { x: rightEdge - revW, y, size: 10, font: bold, color: COLORS.TEXT_DARK });
  }

  y -= 40;

  // Footer
  drawLine(page, margin, 40, rightEdge, 40, 0.5);
  page.drawText(`Bookal Executive Report  |  Generated: ${new Date().toISOString().split('T')[0]}`, {
    x: margin, y: 25, size: 8, font: regular, color: COLORS.TEXT_MUTED,
  });

  return pdfDoc.save();
}

/**
 * Merges multiple PDF buffers into a single buffer.
 */
export async function mergePdfs(pdfBuffers: Uint8Array[]): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();
  for (const pdfBuffer of pdfBuffers) {
    try {
      const pdf = await PDFDocument.load(pdfBuffer);
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    } catch (err) {
      console.error("Error merging PDF chunk:", err);
    }
  }
  return mergedPdf.save();
}
