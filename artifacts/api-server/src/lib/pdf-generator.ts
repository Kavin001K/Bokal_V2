/**
 * Professional PDF Generator for Bookal using pdf-lib.
 * Generates a branded, high-fidelity receipt and terms & conditions.
 */
import { readFile } from "node:fs/promises";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont, degrees } from "pdf-lib";

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

function cleanText(text: string | null | undefined, preserveUnicode = false): string {
  if (!text) return "";
  const normalized = text.toString().trim();
  if (preserveUnicode) return normalized;
  return normalized.replace(/[^\x20-\x7E\s]/g, "");
}

function hasTamil(text: string | null | undefined): boolean {
  return !!text && /[\u0B80-\u0BFF]/.test(text);
}

async function loadTamilFontIfConfigured(pdfDoc: PDFDocument): Promise<PDFFont | null> {
  const tamilFontPath = process.env.PDF_TAMIL_FONT_PATH;
  if (!tamilFontPath) return null;
  try {
    const fontBytes = await readFile(tamilFontPath);
    pdfDoc.registerFontkit(fontkit);
    return await pdfDoc.embedFont(fontBytes);
  } catch {
    return null;
  }
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
    page.drawRectangle({ x: x - 3, y: y - h, width: 6, height: s, borderColor: color, borderWidth: 1 });
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
    page.drawLine({ start: { x, y }, end: { x: x + h - 4, y }, thickness: 1.2, color });
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
    const tamilFont = await loadTamilFontIfConfigured(pdfDoc);
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const supportsTamilText = !!tamilFont;
    const bodyFont = tamilFont && (
      hasTamil(data.customerName) ||
      hasTamil(data.address) ||
      hasTamil(data.tamilDate) ||
      hasTamil(data.notes) ||
      data.venues.some((v) => hasTamil(v.name))
    ) ? tamilFont : regular;

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
      // Reduced Header Height for better space utilization
      const headerH = 155;
      p.drawRectangle({ x: 0, y: HEIGHT - headerH, width: WIDTH, height: headerH, color: COLORS.PRIMARY });
      
      // Glassy decorative waves (Subtle and Premium)
      [0.12, 0.06, 0.03].forEach((op, i) => {
        p.drawEllipse({
          x: WIDTH - (25 * i),
          y: HEIGHT - (15 * i),
          xScale: 320 - (i * 50),
          yScale: 220 - (i * 40),
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
      p.drawText(cleanText(biz.name, supportsTamilText), { x: logoX + 55, y: HEIGHT - 90, size: 42, font: bold, color: COLORS.WHITE });
      p.drawText(cleanText(biz.tagline, supportsTamilText), { x: logoX + 58, y: HEIGHT - 110, size: 14, font: bodyFont, color: COLORS.WHITE });

      // Business Details (Right)
      let bizY = HEIGHT - 50;
      const drawBizInfo = (text: string, icon: string) => {
        if (!text) return;
        drawIcon(p, icon, WIDTH - 220, bizY + 4, 11, COLORS.ACCENT);
        p.drawText(cleanText(text, supportsTamilText), { x: WIDTH - 205, y: bizY, size: 9.5, font: bodyFont, color: COLORS.WHITE });
        bizY -= 18;
      };
      drawBizInfo(biz.address, "pin");
      drawBizInfo(biz.phone, "phone");
      drawBizInfo(biz.email, "mail");
      if (biz.gst) drawBizInfo(`GST: ${biz.gst}`, "document");

      // Ref Badge (More Compact)
      const refText = `REF: ${data.bookingRef}`;
      const refW = bold.widthOfTextAtSize(refText, 10);
      p.drawRectangle({ x: WIDTH - MARGIN - refW - 20, y: HEIGHT - 135, width: refW + 20, height: 22, color: COLORS.ACCENT });
      p.drawText(refText, { x: WIDTH - MARGIN - refW - 10, y: HEIGHT - 128, size: 10, font: bold, color: COLORS.WHITE });
    };

    const drawWatermark = (p: PDFPage) => {
      const wmText = "BOOKAL";
      const wmW = bold.widthOfTextAtSize(wmText, 80);
      p.drawText(wmText, {
        x: (WIDTH - wmW) / 2,
        y: HEIGHT / 2 - 40,
        size: 80,
        font: bold,
        color: COLORS.BORDER,
        opacity: 0.08,
        rotate: degrees(45)
      });

      if (data.isPaid) {
        const paidText = "PAID";
        const paidW = bold.widthOfTextAtSize(paidText, 120);
        p.drawText(paidText, {
          x: WIDTH - 200,
          y: 200,
          size: 120,
          font: bold,
          color: COLORS.SUCCESS,
          opacity: 0.1,
          rotate: degrees(15)
        });
      }
    };

    const drawFooter = (p: PDFPage, pageNum: number) => {
      p.drawRectangle({ x: MARGIN, y: 15, width: WIDTH - MARGIN * 2, height: 25, color: COLORS.BG_LIGHT });
      p.drawText(`Page ${pageNum}`, { x: WIDTH / 2 - 15, y: 24, size: 8.5, font: regular, color: COLORS.TEXT_MUTED });
      p.drawText(`Generated: ${new Date().toLocaleDateString()}`, { x: MARGIN + 12, y: 24, size: 7.5, font: regular, color: COLORS.TEXT_MUTED });
      p.drawText("Premium Venue Management", { x: WIDTH - MARGIN - 110, y: 24, size: 7.5, font: regular, color: COLORS.TEXT_MUTED });
    };

    const drawSignatures = (p: PDFPage) => {
      const sigY = 110; // Fixed bottom position
      const sigW = 170;
      
      // Customer side
      drawLine(p, MARGIN + 10, sigY + 25, MARGIN + sigW, sigY + 25, 0.8, COLORS.TEXT_DARK);
      p.drawText("Customer Signature", { x: MARGIN + 30, y: sigY + 10, size: 9.5, font: regular, color: COLORS.TEXT_MUTED });

      // Stamp & Seal Area (Centered)
      const sealX = WIDTH / 2;
      const sealY = sigY + 35;
      p.drawCircle({ x: sealX, y: sealY, size: 32, borderColor: COLORS.ACCENT, borderWidth: 0.5, opacity: 0.2 });
      p.drawCircle({ x: sealX, y: sealY, size: 28, borderColor: COLORS.ACCENT, borderWidth: 1.5 });
      p.drawCircle({ x: sealX, y: sealY, size: 24, borderColor: COLORS.ACCENT, borderWidth: 0.5, opacity: 0.3 });
      drawIcon(p, "crown", sealX, sealY, 16, COLORS.ACCENT);
      p.drawText("OFFICIAL SEAL", { x: sealX - 25, y: sigY - 5, size: 7, font: bold, color: COLORS.ACCENT });

      // Authorized side
      const authX = WIDTH - MARGIN - sigW;
      drawLine(p, authX, sigY + 25, WIDTH - MARGIN - 10, sigY + 25, 0.8, COLORS.TEXT_DARK);
      p.drawText("Authorized Signature & Stamp", { x: authX + 15, y: sigY + 10, size: 9.5, font: regular, color: COLORS.TEXT_MUTED });
    };

    drawHeader(page);
    drawWatermark(page);
    y = HEIGHT - 190;

    // Title (More Elegant)
    const title = "BOOKING CONFIRMATION RECEIPT";
    const titleW = bold.widthOfTextAtSize(title, 20);
    page.drawText(title, { x: (WIDTH - titleW) / 2, y, size: 20, font: bold, color: COLORS.TEXT_DARK });
    y -= 8;
    drawLine(page, WIDTH/2 - 30, y, WIDTH/2 + 30, y, 1.5, COLORS.ACCENT);
    y -= 35;

    // Information Grid (More Compact)
    const colW = (WIDTH - MARGIN * 2 - 30) / 2;
    const cardH = 135;

    // Card 1: Client
    page.drawRectangle({ x: MARGIN, y: y - cardH, width: colW, height: cardH, color: COLORS.WHITE, borderColor: COLORS.BORDER, borderWidth: 1 });
    drawSectionHeader(page, "CLIENT INFORMATION", "user", MARGIN + 10, y - 5, bold);
    
    let cardY = y - 40;
    const drawRow = (p: PDFPage, label: string, val: string, lx: number, rx: number) => {
      p.drawText(label, { x: lx, y: cardY, size: 10, font: regular, color: COLORS.TEXT_MUTED });
      p.drawText(cleanText(val, supportsTamilText), { x: rx, y: cardY, size: 10.5, font: bodyFont, color: COLORS.TEXT_DARK });
      cardY -= 22;
    };
    
    drawRow(page, "Name", data.customerName, MARGIN + 25, MARGIN + 85);
    drawRow(page, "Phone", data.phones, MARGIN + 25, MARGIN + 85);
    page.drawText("Address", { x: MARGIN + 25, y: cardY, size: 10, font: regular, color: COLORS.TEXT_MUTED });
    const addrLines = wrapText(data.address, colW - 95, bodyFont, 10);
    addrLines.slice(0, 3).forEach((l, i) => {
      page.drawText(cleanText(l, supportsTamilText), { x: MARGIN + 85, y: cardY - (i * 14), size: 10, font: bodyFont, color: COLORS.TEXT_DARK });
    });

    // Card 2: Schedule
    const col2X = MARGIN + colW + 30;
    page.drawRectangle({ x: col2X, y: y - cardH, width: colW, height: cardH, color: COLORS.WHITE, borderColor: COLORS.BORDER, borderWidth: 1 });
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
    page.drawRectangle({ x: MARGIN, y: y - 25, width: WIDTH - MARGIN * 2, height: 25, color: COLORS.BG_LIGHT });
    page.drawText("Description / Venue Name", { x: MARGIN + 15, y: y - 17, size: 10, font: bold, color: COLORS.ACCENT });
    page.drawText("Subtotal (Rs.)", { x: WIDTH - MARGIN - 100, y: y - 17, size: 10, font: bold, color: COLORS.ACCENT });
    y -= 35;

    data.venues.forEach((v, i) => {
      // Check for page overflow
      if (y < 200) { // Keep enough space for table and signatures
        drawFooter(page, 1);
        page = pdfDoc.addPage([WIDTH, HEIGHT]);
        drawHeader(page);
        drawWatermark(page);
        y = HEIGHT - 190;
        // Repeat table header
        page.drawRectangle({ x: MARGIN, y: y - 25, width: WIDTH - MARGIN * 2, height: 25, color: COLORS.BG_LIGHT });
        page.drawText("Description / Venue Name", { x: MARGIN + 15, y: y - 17, size: 10, font: bold, color: COLORS.ACCENT });
        page.drawText("Subtotal (Rs.)", { x: WIDTH - MARGIN - 100, y: y - 17, size: 10, font: bold, color: COLORS.ACCENT });
        y -= 35;
      }

      if (i % 2 === 1) {
        page.drawRectangle({ x: MARGIN + 5, y: y - 8, width: WIDTH - MARGIN * 2 - 10, height: 22, color: COLORS.BG_LIGHT, opacity: 0.5 });
      }
      page.drawText(cleanText(v.name, supportsTamilText), { x: MARGIN + 15, y, size: 11, font: bodyFont, color: COLORS.TEXT_DARK });
      const pText = `Rs. ${v.price}`;
      const pw = bold.widthOfTextAtSize(pText, 11);
      page.drawText(pText, { x: WIDTH - MARGIN - pw - 15, y, size: 11, font: bold, color: COLORS.TEXT_DARK });
      y -= 25;
      drawLine(page, MARGIN + 15, y + 20, WIDTH - MARGIN - 15, y + 20, 0.5, COLORS.BORDER);
    });

    y -= 15;
    
    // Notes Section (If present)
    if (data.notes && data.notes.trim()) {
      if (y < 200) {
        drawFooter(page, 1);
        page = pdfDoc.addPage([WIDTH, HEIGHT]);
        drawHeader(page);
        drawWatermark(page);
        y = HEIGHT - 190;
      }
      
      drawSectionHeader(page, "SPECIAL INSTRUCTIONS", "document", MARGIN, y + 5, bold);
      y -= 25;
      const notesLines = wrapText(data.notes, WIDTH - MARGIN * 2 - 40, bodyFont, 10);
      notesLines.forEach(line => {
        // Handle page overflow within notes
        if (y < 120) {
          drawFooter(page, 1);
          page = pdfDoc.addPage([WIDTH, HEIGHT]);
          drawHeader(page);
          drawWatermark(page);
          y = HEIGHT - 190;
        }
        page.drawText(cleanText(line, supportsTamilText), { x: MARGIN + 35, y, size: 10, font: bodyFont, color: COLORS.TEXT_MUTED });
        y -= 15;
      });
      y -= 10;
    }

    // Totals Block
    if (y < 240) { // Ensure totals and signatures don't clash
      drawFooter(page, 1);
      page = pdfDoc.addPage([WIDTH, HEIGHT]);
      drawHeader(page);
      drawWatermark(page);
      y = HEIGHT - 190;
    }

    const totalBoxH = 110;
    page.drawRectangle({ x: MARGIN, y: y - totalBoxH, width: WIDTH - MARGIN * 2, height: totalBoxH, color: COLORS.BG_LIGHT, borderColor: COLORS.ACCENT, borderWidth: 1 });
    
    // Left side: Advance & Balance
    const totalVal = parseFloat(data.totalAmount.replace(/,/g, '')) || 0;
    const advVal = parseFloat(data.advanceAmount.replace(/,/g, '')) || 0;
    const balVal = totalVal - advVal;

    page.drawText("FINANCIAL SUMMARY", { x: MARGIN + 25, y: y - 25, size: 11, font: bold, color: COLORS.PRIMARY });
    
    // Payment Status Badge
    const statusText = data.isPaid ? "FULLY PAID" : "BALANCE DUE";
    const statusColor = data.isPaid ? COLORS.SUCCESS : COLORS.ACCENT;
    const stW = bold.widthOfTextAtSize(statusText, 8);
    page.drawRectangle({ x: MARGIN + 25, y: y - 42, width: stW + 15, height: 14, color: statusColor, opacity: 0.15 });
    page.drawText(statusText, { x: MARGIN + 32, y: y - 37, size: 8, font: bold, color: statusColor });

    page.drawText(`Advance Paid: Rs. ${data.advanceAmount}`, { x: MARGIN + 25, y: y - 65, size: 10.5, font: regular, color: COLORS.TEXT_MUTED });
    page.drawText(`Balance Due: Rs. ${balVal.toLocaleString('en-IN')}`, { x: MARGIN + 25, y: y - 85, size: 12, font: bold, color: COLORS.ACCENT });

    // Right side: Grand Total
    const gt = `Rs. ${data.totalAmount}`;
    const gtW = bold.widthOfTextAtSize(gt, 38);
    page.drawText("GRAND TOTAL", { x: WIDTH - MARGIN - gtW - 10, y: y - 35, size: 13, font: bold, color: COLORS.TEXT_DARK });
    page.drawText(gt, { x: WIDTH - MARGIN - gtW - 10, y: y - 80, size: 38, font: bold, color: COLORS.PRIMARY });

    y -= (totalBoxH + 30);

    // Signatures
    drawSignatures(page);
    drawFooter(page, 1);

    // ─── PAGE 2: TERMS & CONDITIONS ──────────────────────────────────────────
    const termsPage = pdfDoc.addPage([WIDTH, HEIGHT]);
    drawHeader(termsPage);
    drawWatermark(termsPage);
    let ty = HEIGHT - 190;

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
    throw err;
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
