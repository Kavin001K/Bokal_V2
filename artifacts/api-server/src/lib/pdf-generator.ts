/**
 * Professional PDF Generator for Bookal using pdf-lib.
 * Generates a branded, high-fidelity receipt (Page 1) and rules/conditions (Page 2).
 */
import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from "pdf-lib";

/**
 * Utility to clean text for PDF generation, removing characters that might cause
 * issues with standard Helvetica fonts (which only support WinAnsiEncoding).
 */
function cleanText(text: string | null | undefined): string {
  if (!text) return "";
  // Remove non-standard characters that Helvetica can't render
  return text.toString().replace(/[^\x20-\x7E]/g, "");
}

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

// ─── Palette ────────────────────────────────────────────────────────────────
const PRIMARY = rgb(0.49, 0.21, 0.09); // #7C3518 (Header Brown)
const ACCENT = rgb(0.78, 0.36, 0.16);  // #C75B2A (Branding Orange/Brown)
const TEXT_DARK = rgb(0.10, 0.07, 0.04); // #1A1209
const TEXT_MUTED = rgb(0.42, 0.34, 0.27); // #6B5744
const BORDER = rgb(0.91, 0.87, 0.83); // #E8DDD4
const WHITE = rgb(1, 1, 1);
const BG_LIGHT = rgb(0.99, 0.97, 0.95); // #FDF8F3

// ─── Utilities ──────────────────────────────────────────────────────────────
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

function drawLine(page: PDFPage, x1: number, y1: number, x2: number, y2: number, thickness = 0.5, color = BORDER) {
  page.drawLine({
    start: { x: x1, y: y1 },
    end: { x: x2, y: y2 },
    thickness,
    color,
  });
}

function drawIcon(page: PDFPage, type: string, x: number, y: number, size: number, color = WHITE) {
  const s = size;
  const h = s / 2;
  
  if (type === "user") {
    page.drawCircle({ x, y: y + s/4, size: s/4, color }); // head
    page.drawEllipse({ x, y: y - s/4, xScale: s/2, yScale: s/4, color }); // shoulders
  } else if (type === "calendar") {
    page.drawRectangle({ x: x - h, y: y - h, width: s, height: s, borderColor: color, borderWidth: 1.5 });
    page.drawLine({ start: { x: x - h, y: y + h - 3 }, end: { x: x + h, y: y + h - 3 }, thickness: 1.5, color });
    page.drawRectangle({ x: x - h + 2, y: y + h - 1, width: 2, height: 3, color });
    page.drawRectangle({ x: x + h - 4, y: y + h - 1, width: 2, height: 3, color });
  } else if (type === "building") {
    page.drawRectangle({ x: x - h, y: y - h, width: s, height: s, borderColor: color, borderWidth: 1.5 });
    page.drawRectangle({ x: x - 2, y: y - h, width: 4, height: 6, color }); // door
  } else if (type === "document") {
    page.drawRectangle({ x: x - h + 2, y: y - h, width: s - 4, height: s, borderColor: color, borderWidth: 1.5 });
    page.drawLine({ start: { x: x - 2, y: y + 2 }, end: { x: x + 2, y: y + 2 }, thickness: 1, color });
    page.drawLine({ start: { x: x - 2, y: y }, end: { x: x + 2, y: y }, thickness: 1, color });
  } else if (type === "pin") {
    page.drawCircle({ x, y: y + 2, size: s/3, borderColor: color, borderWidth: 1.5 });
    page.drawLine({ start: { x, y: y - h }, end: { x, y: y + 2 }, thickness: 1.5, color });
  } else if (type === "phone") {
    page.drawRectangle({ x: x - 3, y: y - h, width: 6, height: s, borderColor: color, borderWidth: 1, borderRadius: 1 });
    page.drawCircle({ x, y: y - h + 2, size: 1, color });
  } else if (type === "mail") {
    page.drawRectangle({ x: x - h, y: y - 3, width: s, height: s - 3, borderColor: color, borderWidth: 1.5 });
    page.drawLine({ start: { x: x - h, y: y + h - 3 }, end: { x: x, y: y - 1 }, thickness: 1, color });
    page.drawLine({ start: { x: x + h, y: y + h - 3 }, end: { x: x, y: y - 1 }, thickness: 1, color });
  } else if (type === "crown") {
    const b = y - h + 2; 
    const t = y + h - 2; 
    page.drawLine({ start: { x: x - h, y: b }, end: { x: x + h, y: b }, thickness: 1.5, color });
    page.drawLine({ start: { x: x - h, y: b }, end: { x: x - h, y: t }, thickness: 1.5, color });
    page.drawLine({ start: { x: x + h, y: b }, end: { x: x + h, y: t }, thickness: 1.5, color });
    page.drawLine({ start: { x: x - h, y: t }, end: { x: x - h/2, y: y }, thickness: 1.5, color });
    page.drawLine({ start: { x: x - h/2, y: y }, end: { x: x, y: t }, thickness: 1.5, color });
    page.drawLine({ start: { x: x, y: t }, end: { x: x + h/2, y: y }, thickness: 1.5, color });
    page.drawLine({ start: { x: x + h/2, y: y }, end: { x: x + h, y: t }, thickness: 1.5, color });
  } else if (type === "shield") {
    page.drawLine({ start: { x: x - h, y: y + h }, end: { x: x + h, y: y + h }, thickness: 1.5, color });
    page.drawLine({ start: { x: x - h, y: y + h }, end: { x: x - h, y: y }, thickness: 1.5, color });
    page.drawLine({ start: { x: x + h, y: y + h }, end: { x: x + h, y: y }, thickness: 1.5, color });
    page.drawLine({ start: { x: x - h, y: y }, end: { x: x, y: y - h }, thickness: 1.5, color });
    page.drawLine({ start: { x: x, y: y - h }, end: { x: x + h, y: y }, thickness: 1.5, color });
  } else if (type === "clock") {
    page.drawCircle({ x: x, y: y, size: h, borderColor: color, borderWidth: 1.5 });
    page.drawLine({ start: { x: x, y: y }, end: { x: x, y: y + h - 3 }, thickness: 1.5, color: color });
    page.drawLine({ start: { x: x, y: y }, end: { x: x + h - 4, y: y }, thickness: 1.5, color: color });
  }
}

function drawSectionIcon(page: PDFPage, type: string, x: number, y: number, color = ACCENT) {
  page.drawCircle({ x, y, size: 14, color, opacity: 1 });
  drawIcon(page, type, x, y, 12, WHITE);
}

// ─── Core Templates ─────────────────────────────────────────────────────────

// ─── Core Templates ─────────────────────────────────────────────────────────

// ─── Core Templates ─────────────────────────────────────────────────────────

/**
 * Generates the ultimate Executive Gold Standard Booking Confirmation PDF.
 */
export async function generateBookingConfirmationPdf(data: BookingPdfData): Promise<Uint8Array> {
  try {
    const pdfDoc = await PDFDocument.create();
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const page1 = pdfDoc.addPage([595, 842]);
    const { width, height } = page1.getSize();

    const biz = data.business || {
      name: "BOOKAL",
      tagline: "Excellence in Event",
      address: "1/85 Zamin Kottampatti, Pollachi, TN 642123",
      phone: "+91 88257 02072",
      email: "bookings@bookal.app",
      gst: "33AAAAA0000A1Z5"
    };

    const margin = 45;
    const rightEdge = width - margin;

    // --- 0. BACKGROUND WATERMARK (ULTRA-SUBTLE) ---
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 4; j++) {
        page1.drawText("BOOKAL", {
          x: j * 160 + (i % 2 ? 80 : 0),
          y: i * 140,
          size: 44,
          font: bold,
          color: PRIMARY,
          opacity: 0.006, // Reduced for subtle elegance
          rotate: { type: 'degrees', angle: 30 }
        });
      }
    }

    // --- 1. HEADER: MULTI-LAYERED GLASSY WAVES ---
    const headerHeight = 195;
    page1.drawRectangle({ x: 0, y: height - headerHeight, width, height: headerHeight, color: PRIMARY });
    
    const waveOpacities = [0.28, 0.12, 0.18];
    [0, 1, 2].forEach(i => {
      page1.drawEllipse({
        x: width + (25 * i),
        y: height - (15 * i),
        xScale: 350 - (i * 35),
        yScale: 320 - (i * 25),
        color: i === 1 ? WHITE : ACCENT,
        opacity: waveOpacities[i]
      });
    });

    // Logo (Hexagon)
    const hexX = margin + 25;
    const hexY = height - 90;
    const s = 26; 
    const c30 = 0.866; 
    const s30 = 0.5;   
    const hPts = [
      { x: hexX, y: hexY + s },
      { x: hexX + s * c30, y: hexY + s * s30 },
      { x: hexX + s * c30, y: hexY - s * s30 },
      { x: hexX, y: hexY - s },
      { x: hexX - s * c30, y: hexY - s * s30 },
      { x: hexX - s * c30, y: hexY + s * s30 }
    ];
    for (let i = 0; i < 6; i++) {
      page1.drawLine({ start: hPts[i], end: hPts[(i+1)%6], thickness: 3, color: WHITE });
    }
    page1.drawText("B", { x: hexX - 9, y: hexY - 9, size: 28, font: bold, color: WHITE });
    
    page1.drawText(cleanText(biz.name), { x: margin + 75, y: height - 100, size: 48, font: bold, color: WHITE });
    page1.drawText(cleanText(biz.tagline), { x: margin + 78, y: height - 120, size: 15, font: regular, color: WHITE });

    // Business Info (Right)
    let bizY = height - 50;
    const bizFontSize = 10;
    const bizTextX = width - 210;

    const drawHeaderContact = (text: string, iconType: string) => {
      if (!text) return;
      drawIcon(page1, iconType, bizTextX - 22, bizY + 3, 13, ACCENT);
      page1.drawText(cleanText(text), { x: bizTextX, y: bizY, size: bizFontSize, font: regular, color: WHITE });
      bizY -= 20;
    };

    drawHeaderContact(biz.address, "pin");
    drawHeaderContact(biz.phone, "phone");
    drawHeaderContact(biz.email, "mail");
    if (biz.gst) drawHeaderContact(`GST: ${biz.gst}`, "document");

    // Reference Badge
    const refLabel = `REF: ${data.bookingRef}`;
    const refW = bold.widthOfTextAtSize(refLabel, 11);
    page1.drawRectangle({ x: rightEdge - refW - 28, y: height - 165, width: refW + 28, height: 28, color: WHITE, opacity: 0.1 });
    page1.drawRectangle({ x: rightEdge - refW - 28, y: height - 165, width: refW + 28, height: 28, color: ACCENT, borderRadius: 5 });
    page1.drawText(refLabel, { x: rightEdge - refW - 14, y: height - 157, size: 11, font: bold, color: WHITE });

    // --- 2. TITLE & SEPARATOR ---
    let y = height - 235;
    const title = "BOOKING RECEIPT";
    const titleW = bold.widthOfTextAtSize(title, 30);
    page1.drawText(title, { x: (width - titleW) / 2, y, size: 30, font: bold, color: TEXT_DARK });
    
    y -= 22;
    const sepX = width / 2;
    drawLine(page1, margin + 40, y, sepX - 30, y, 0.8, BORDER);
    drawLine(page1, sepX + 30, y, rightEdge - 40, y, 0.8, BORDER);
    page1.drawRectangle({ x: sepX - 5, y: y - 5, width: 10, height: 10, color: ACCENT, rotate: { type: 'degrees', angle: 45 } });

    // --- 3. INFORMATION CARDS ---
    y -= 75;
    const cardW = (width - margin * 2 - 30) / 2;
    const cardH = 170;
    
    // Subtle Drop Shadows
    page1.drawRectangle({ x: margin + 3, y: y - cardH - 3, width: cardW, height: cardH, color: TEXT_DARK, opacity: 0.04, borderRadius: 12 });
    page1.drawRectangle({ x: margin + cardW + 33, y: y - cardH - 3, width: cardW, height: cardH, color: TEXT_DARK, opacity: 0.04, borderRadius: 12 });

    // Card 1
    page1.drawRectangle({ x: margin, y: y - cardH, width: cardW, height: cardH, color: WHITE, borderColor: BORDER, borderWidth: 1.5, borderRadius: 12 });
    drawSectionIcon(page1, "user", margin + 28, y);
    page1.drawText("CLIENT INFORMATION", { x: margin + 52, y: y - 5, size: 12, font: bold, color: ACCENT });
    
    // Card 2
    const col2X = margin + cardW + 30;
    page1.drawRectangle({ x: col2X, y: y - cardH, width: cardW, height: cardH, color: WHITE, borderColor: BORDER, borderWidth: 1.5, borderRadius: 12 });
    drawSectionIcon(page1, "calendar", col2X + 28, y);
    page1.drawText("EVENT SCHEDULE", { x: col2X + 52, y: y - 5, size: 12, font: bold, color: ACCENT });

    let cardY = y - 45;
    const labelSize = 10.5;
    const valueSize = 11.5;

    const drawCard1Row = (label: string, value: string) => {
      page1.drawText(label, { x: margin + 22, y: cardY, size: labelSize, font: regular, color: TEXT_MUTED });
      page1.drawText(cleanText(value), { x: margin + 115, y: cardY, size: valueSize, font: bold, color: TEXT_DARK });
      cardY -= 30;
    };
    drawCard1Row("Customer Name", data.customerName);
    drawCard1Row("Phone", data.phones);
    page1.drawText("Address", { x: margin + 22, y: cardY, size: labelSize, font: regular, color: TEXT_MUTED });
    const addrLines = wrapText(data.address, cardW - 130, regular, valueSize);
    addrLines.slice(0, 3).forEach((line, i) => {
      page1.drawText(cleanText(line), { x: margin + 115, y: cardY - (i * 15), size: valueSize, font: bold, color: TEXT_DARK });
    });

    cardY = y - 45;
    const drawCard2Row = (label: string, value: string) => {
      page1.drawText(label, { x: col2X + 22, y: cardY, size: labelSize, font: regular, color: TEXT_MUTED });
      page1.drawText(cleanText(value), { x: col2X + 110, y: cardY, size: valueSize, font: bold, color: TEXT_DARK });
      cardY -= 30;
    };
    drawCard2Row("Date", data.bookingDate);
    drawCard2Row("Tamil Date", data.tamilDate);
    drawCard2Row("Time", `${data.startTime} - ${data.endTime}`);
    drawCard2Row("Duration", `${data.duration} hours`);

    // --- 4. VENUE & PRICING TABLE (OPTIMIZED) ---
    y -= (cardH + 50);
    drawSectionIcon(page1, "building", margin + 22, y);
    page1.drawText("VENUE & PRICING", { x: margin + 46, y: y - 5, size: 12, font: bold, color: ACCENT });
    
    y -= 35;
    page1.drawRectangle({ x: margin, y: y - 24, width: width - margin * 2, height: 24, color: BG_LIGHT, borderRadius: 6 });
    page1.drawText("Description", { x: margin + 15, y: y - 16, size: 10.5, font: bold, color: ACCENT });
    page1.drawText("Subtotal (Rs.)", { x: rightEdge - 100, y: y - 16, size: 10.5, font: bold, color: ACCENT });
    
    y -= 48;
    data.venues.forEach((venue, i) => {
      if (i % 2 === 1) {
        page1.drawRectangle({ x: margin + 10, y: y - 5, width: width - margin * 2 - 20, height: 20, color: BG_LIGHT, opacity: 0.5 });
      }
      page1.drawText(cleanText(venue.name), { x: margin + 15, y, size: 12.5, font: regular, color: TEXT_DARK });
      const price = `Rs. ${venue.price}`;
      const priceW = bold.widthOfTextAtSize(price, 12.5);
      page1.drawText(price, { x: rightEdge - priceW - 15, y, size: 12.5, font: bold, color: TEXT_DARK });
      y -= 26;
      drawLine(page1, margin + 15, y + 22, rightEdge - 15, y + 22, 0.4, BORDER);
    });

    // --- 5. TOTALS BLOCK (EXECUTIVE STYLE) ---
    y -= 85;
    // Outer Shadow
    page1.drawRectangle({ x: margin + 3, y: y - 3, width: width - margin * 2, height: 110, color: TEXT_DARK, opacity: 0.05, borderRadius: 15 });
    page1.drawRectangle({ x: margin, y, width: width - margin * 2, height: 110, color: WHITE, borderColor: BORDER, borderWidth: 1.5, borderRadius: 15 });
    
    // Glassy Decorative Pattern
    page1.drawCircle({ x: rightEdge - 30, y: y + 25, size: 55, color: BG_LIGHT, opacity: 0.5 });
    page1.drawCircle({ x: rightEdge - 30, y: y + 25, size: 55, borderColor: ACCENT, borderWidth: 0.25, opacity: 0.2 });

    page1.drawText("GRAND TOTAL", { x: margin + 35, y: y + 78, size: 18, font: bold, color: TEXT_DARK });
    
    // Advance Paid Unit
    const boxX = margin + 35;
    const boxY = y + 30;
    page1.drawRectangle({ x: boxX, y: boxY - 10, width: 145, height: 48, color: BG_LIGHT, borderRadius: 10 });
    drawIcon(page1, "document", boxX + 20, boxY + 12, 14, ACCENT);
    page1.drawText("Advance Paid", { x: boxX + 42, y: boxY + 18, size: 10, font: regular, color: TEXT_MUTED });
    page1.drawText(`Rs. ${data.advanceAmount}`, { x: boxX + 42, y: boxY + 2, size: 15, font: bold, color: TEXT_DARK });

    // Vertical Divider
    drawLine(page1, margin + 215, y + 20, margin + 215, y + 90, 1.2, BORDER);

    const grandTotal = `Rs. ${data.totalAmount}`;
    const gtSize = 48;
    const gtW = bold.widthOfTextAtSize(grandTotal, gtSize);
    page1.drawText(grandTotal, { x: rightEdge - gtW - 35, y: y + 50, size: gtSize, font: bold, color: PRIMARY });

    if (data.isPaid) {
      const statusLabel = "PAYMENT STATUS";
      const slW = regular.widthOfTextAtSize(statusLabel, 10.5);
      page1.drawText(statusLabel, { x: rightEdge - slW - 35, y: y + 32, size: 10.5, font: regular, color: TEXT_DARK });

      const statusText = "FULLY PAID";
      const stW = bold.widthOfTextAtSize(statusText, 11.5);
      const pillW = stW + 40;
      const pillX = rightEdge - pillW - 35;
      const pillY = y + 10;
      
      page1.drawRectangle({ x: pillX, y: pillY, width: pillW, height: 22, borderColor: rgb(0.1, 0.6, 0.2), borderWidth: 2, borderRadius: 11 });
      
      const checkX = pillX + 14;
      const checkY = pillY + 11;
      page1.drawLine({ start: { x: checkX - 4, y: checkY }, end: { x: checkX - 1, y: checkY - 3 }, thickness: 2.2, color: rgb(0.1, 0.6, 0.2) });
      page1.drawLine({ start: { x: checkX - 1, y: checkY - 3 }, end: { x: checkX + 5, y: checkY + 5 }, thickness: 2.2, color: rgb(0.1, 0.6, 0.2) });
      
      page1.drawText(statusText, { x: pillX + 28, y: pillY + 7, size: 11.5, font: bold, color: rgb(0.1, 0.6, 0.2) });
    }

    // --- 6. SIGNATURES (PRESTIGIOUS SEAL) ---
    y -= 120;
    const sigLineW = 195;
    
    // Customer
    drawLine(page1, margin, y + 20, margin + sigLineW, y + 20, 1.2, TEXT_DARK);
    page1.drawText("Customer Signature", { x: margin + 45, y: y + 5, size: 11, font: regular, color: TEXT_MUTED });

    // Official Seal (Multi-ring Medallion)
    const sealX = width / 2;
    const sealY = y + 38;
    page1.drawCircle({ x: sealX, y: sealY, size: 30, borderColor: ACCENT, borderWidth: 0.5, opacity: 0.3 });
    page1.drawCircle({ x: sealX, y: sealY, size: 26, borderColor: ACCENT, borderWidth: 1.8 });
    page1.drawCircle({ x: sealX, y: sealY, size: 23, borderColor: ACCENT, borderWidth: 0.5, opacity: 0.6 });
    drawIcon(page1, "crown", sealX, sealY, 17, ACCENT);

    // Authorized
    const authX = rightEdge - sigLineW;
    drawLine(page1, authX, y + 20, rightEdge, y + 20, 1.2, TEXT_DARK);
    page1.drawText("Authorized Signature & Stamp", { x: authX + 25, y: y + 5, size: 11, font: regular, color: TEXT_MUTED });

    // --- 7. FOOTER (DYNAMIC & PINNED) ---
    const footerY = 25;
    page1.drawRectangle({ x: margin, y: footerY - 5, width: width - margin * 2, height: 35, color: BG_LIGHT, borderRadius: 10 });
    
    drawIcon(page1, "calendar", margin + 18, footerY + 12, 11, ACCENT);
    page1.drawText(`Booked by: ${data.createdBy}`, { x: margin + 35, y: footerY + 9, size: 10, font: regular, color: TEXT_MUTED });
    
    drawLine(page1, margin + 175, footerY + 7, margin + 175, footerY + 23, 0.8, BORDER);
    
    drawIcon(page1, "clock", margin + 192, footerY + 12, 11, ACCENT);
    page1.drawText(`Created: ${data.createdAt.split('T')[0]}`, { x: margin + 210, y: footerY + 9, size: 10, font: regular, color: TEXT_MUTED });
    
    drawLine(page1, margin + 340, footerY + 7, margin + 340, footerY + 23, 0.8, BORDER);

    const genLabel = "Generated by Bookal Management System";
    const glW = regular.widthOfTextAtSize(genLabel, 10);
    drawIcon(page1, "shield", rightEdge - glW - 35, footerY + 12, 11, ACCENT);
    page1.drawText(genLabel, { x: rightEdge - glW - 15, y: footerY + 9, size: 10, font: regular, color: TEXT_MUTED });

    // Outer Document Frame
    page1.drawRectangle({ x: 5, y: 5, width: width - 10, height: height - 10, borderColor: PRIMARY, borderWidth: 0.5, opacity: 0.1 });

    return pdfDoc.save();
  } catch (err) {
    console.error("Executive PDF Error:", err);
    // Safe Fallback
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const p = doc.addPage([595, 842]);
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

  const page = pdfDoc.addPage([595, 842]);
  const { width, height } = page.getSize();
  const margin = 45;
  const rightEdge = width - margin;

  // Header
  page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: PRIMARY });
  page.drawText("EXECUTIVE REPORT", { x: margin, y: height - 45, size: 24, font: bold, color: WHITE });
  page.drawText(`${data.from} to ${data.to}`, { x: margin, y: height - 65, size: 10, font: regular, color: WHITE });

  let y = height - 120;

  // Summary Grid
  page.drawText("PERFORMANCE SUMMARY", { x: margin, y, size: 10, font: bold, color: PRIMARY });
  y -= 25;

  const colWidth = (width - margin * 2) / 3;
  
  // Row 1
  page.drawText("Total Revenue", { x: margin, y, size: 9, font: regular, color: TEXT_MUTED });
  page.drawText("Total Bookings", { x: margin + colWidth, y, size: 9, font: regular, color: TEXT_MUTED });
  page.drawText("Avg. Booking", { x: margin + colWidth * 2, y, size: 9, font: regular, color: TEXT_MUTED });
  y -= 15;
  page.drawText(cleanText(`Rs. ${data.totalRevenue}`), { x: margin, y, size: 12, font: bold, color: TEXT_DARK });
  page.drawText(cleanText(`${data.totalBookings}`), { x: margin + colWidth, y, size: 12, font: bold, color: TEXT_DARK });
  page.drawText(cleanText(`Rs. ${data.avgValue}`), { x: margin + colWidth * 2, y, size: 12, font: bold, color: TEXT_DARK });

  y -= 35;
  
  // Revenue by Venue
  page.drawText("REVENUE BY VENUE", { x: margin, y, size: 10, font: bold, color: PRIMARY });
  y -= 5;
  drawLine(page, margin, y, rightEdge, y, 0.5);
  y -= 18;
  page.drawText("Venue Name", { x: margin, y, size: 9, font: bold, color: TEXT_MUTED });
  page.drawText("Bookings", { x: margin + 250, y, size: 9, font: bold, color: TEXT_MUTED });
  page.drawText("Revenue", { x: rightEdge - 80, y, size: 9, font: bold, color: TEXT_MUTED });
  
  for (const v of data.byVenue) {
    y -= 20;
    page.drawText(cleanText(v.name), { x: margin, y, size: 10, font: regular, color: TEXT_DARK });
    page.drawText(cleanText(`${v.count}`), { x: margin + 250, y, size: 10, font: regular, color: TEXT_DARK });
    const revLabel = cleanText(`Rs. ${v.revenue}`);
    const revW = bold.widthOfTextAtSize(revLabel, 10);
    page.drawText(revLabel, { x: rightEdge - revW, y, size: 10, font: bold, color: TEXT_DARK });
  }

  y -= 40;

  // Revenue by Employee
  page.drawText("PERFORMANCE BY EMPLOYEE", { x: margin, y, size: 10, font: bold, color: PRIMARY });
  y -= 5;
  drawLine(page, margin, y, rightEdge, y, 0.5);
  y -= 18;
  page.drawText("Employee Name", { x: margin, y, size: 9, font: bold, color: TEXT_MUTED });
  page.drawText("Bookings", { x: margin + 250, y, size: 9, font: bold, color: TEXT_MUTED });
  page.drawText("Total Value", { x: rightEdge - 80, y, size: 9, font: bold, color: TEXT_MUTED });

  for (const e of data.byEmployee) {
    y -= 20;
    page.drawText(cleanText(e.name), { x: margin, y, size: 10, font: regular, color: TEXT_DARK });
    page.drawText(cleanText(`${e.count}`), { x: margin + 250, y, size: 10, font: regular, color: TEXT_DARK });
    const revLabel = cleanText(`Rs. ${e.revenue}`);
    const revW = bold.widthOfTextAtSize(revLabel, 10);
    page.drawText(revLabel, { x: rightEdge - revW, y, size: 10, font: bold, color: TEXT_DARK });
  }

  // Footer
  const footerY = 50;
  drawLine(page, margin, footerY + 20, rightEdge, footerY + 20, 0.5);
  page.drawText(cleanText(`Bookal Financial Report  |  Generated: ${new Date().toISOString().split('T')[0]}`), {
    x: margin, y: footerY + 6, size: 7.5, font: regular, color: TEXT_MUTED,
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
