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

/**
 * Generates the premium, pixel-accurate Booking Confirmation PDF.
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

    // --- 1. HEADER: PREMIUM CURVED SHAPE ---
    const headerHeight = 185;
    page1.drawRectangle({ x: 0, y: height - headerHeight, width, height: headerHeight, color: PRIMARY });
    
    // Smooth Wave Sweep
    page1.drawEllipse({
      x: width + 20,
      y: height - 20,
      xScale: 320,
      yScale: 280,
      color: ACCENT,
      opacity: 0.35
    });
    page1.drawEllipse({
      x: width + 50,
      y: height,
      xScale: 300,
      yScale: 260,
      color: WHITE,
      opacity: 0.15
    });

    // Logo (Hexagon)
    const hexX = margin + 25;
    const hexY = height - 85;
    const s = 24; 
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
      page1.drawLine({ start: hPts[i], end: hPts[(i+1)%6], thickness: 2.8, color: WHITE });
    }
    page1.drawText("B", { x: hexX - 8, y: hexY - 8, size: 24, font: bold, color: WHITE });
    
    page1.drawText(cleanText(biz.name), { x: margin + 70, y: height - 92, size: 44, font: bold, color: WHITE });
    page1.drawText(cleanText(biz.tagline), { x: margin + 72, y: height - 110, size: 14, font: regular, color: WHITE });

    // Business Info (Right)
    let bizY = height - 45;
    const bizFontSize = 9.5;
    const bizTextX = width - 200;

    const drawHeaderContact = (text: string, iconType: string) => {
      if (!text) return;
      drawIcon(page1, iconType, bizTextX - 20, bizY + 3, 12, ACCENT);
      page1.drawText(cleanText(text), { x: bizTextX, y: bizY, size: bizFontSize, font: regular, color: WHITE });
      bizY -= 18;
    };

    drawHeaderContact(biz.address, "pin");
    drawHeaderContact(biz.phone, "phone");
    drawHeaderContact(biz.email, "mail");
    if (biz.gst) drawHeaderContact(`GST: ${biz.gst}`, "document");

    // Reference Badge
    const refLabel = `REF: ${data.bookingRef}`;
    const refW = bold.widthOfTextAtSize(refLabel, 10.5);
    page1.drawRectangle({ x: rightEdge - refW - 24, y: height - 150, width: refW + 24, height: 24, color: ACCENT, borderRadius: 4 });
    page1.drawText(refLabel, { x: rightEdge - refW - 12, y: height - 143, size: 10.5, font: bold, color: WHITE });

    // --- 2. TITLE & SEPARATOR ---
    let y = height - 215;
    const title = "BOOKING RECEIPT";
    const titleW = bold.widthOfTextAtSize(title, 26);
    page1.drawText(title, { x: (width - titleW) / 2, y, size: 26, font: bold, color: TEXT_DARK });
    
    y -= 18;
    const sepX = width / 2;
    drawLine(page1, margin + 50, y, sepX - 25, y, 0.5, BORDER);
    drawLine(page1, sepX + 25, y, rightEdge - 50, y, 0.5, BORDER);
    page1.drawRectangle({ x: sepX - 4, y: y - 4, width: 8, height: 8, color: ACCENT, rotate: { type: 'degrees', angle: 45 } });

    // --- 3. INFORMATION CARDS ---
    y -= 65;
    const cardW = (width - margin * 2 - 25) / 2;
    const cardH = 160;
    
    page1.drawRectangle({ x: margin, y: y - cardH, width: cardW, height: cardH, borderColor: BORDER, borderWidth: 1.2, borderRadius: 10 });
    drawSectionIcon(page1, "user", margin + 25, y);
    page1.drawText("CLIENT INFORMATION", { x: margin + 48, y: y - 5, size: 11, font: bold, color: ACCENT });
    
    const col2X = margin + cardW + 25;
    page1.drawRectangle({ x: col2X, y: y - cardH, width: cardW, height: cardH, borderColor: BORDER, borderWidth: 1.2, borderRadius: 10 });
    drawSectionIcon(page1, "calendar", col2X + 25, y);
    page1.drawText("EVENT SCHEDULE", { x: col2X + 48, y: y - 5, size: 11, font: bold, color: ACCENT });

    let cardY = y - 40;
    const labelSize = 10;
    const valueSize = 11;

    const drawCard1Row = (label: string, value: string) => {
      page1.drawText(label, { x: margin + 20, y: cardY, size: labelSize, font: regular, color: TEXT_MUTED });
      page1.drawText(cleanText(value), { x: margin + 105, y: cardY, size: valueSize, font: bold, color: TEXT_DARK });
      cardY -= 28;
    };
    drawCard1Row("Customer Name", data.customerName);
    drawCard1Row("Phone", data.phones);
    page1.drawText("Address", { x: margin + 20, y: cardY, size: labelSize, font: regular, color: TEXT_MUTED });
    const addrLines = wrapText(data.address, cardW - 125, regular, valueSize);
    addrLines.slice(0, 3).forEach((line, i) => {
      page1.drawText(cleanText(line), { x: margin + 105, y: cardY - (i * 14), size: valueSize, font: bold, color: TEXT_DARK });
    });

    cardY = y - 40;
    const drawCard2Row = (label: string, value: string) => {
      page1.drawText(label, { x: col2X + 20, y: cardY, size: labelSize, font: regular, color: TEXT_MUTED });
      page1.drawText(cleanText(value), { x: col2X + 100, y: cardY, size: valueSize, font: bold, color: TEXT_DARK });
      cardY -= 28;
    };
    drawCard2Row("Date", data.bookingDate);
    drawCard2Row("Tamil Date", data.tamilDate);
    drawCard2Row("Time", `${data.startTime} - ${data.endTime}`);
    drawCard2Row("Duration", `${data.duration} hours`);

    // --- 4. VENUE & PRICING TABLE ---
    y -= (cardH + 45);
    drawSectionIcon(page1, "building", margin + 20, y);
    page1.drawText("VENUE & PRICING", { x: margin + 42, y: y - 5, size: 11, font: bold, color: ACCENT });
    
    y -= 30;
    page1.drawRectangle({ x: margin, y: y - 22, width: width - margin * 2, height: 22, color: BG_LIGHT });
    page1.drawText("Description", { x: margin + 12, y: y - 15, size: 10, font: bold, color: ACCENT });
    page1.drawText("Subtotal (Rs.)", { x: rightEdge - 90, y: y - 15, size: 10, font: bold, color: ACCENT });
    
    y -= 45;
    for (const venue of data.venues) {
      page1.drawText(cleanText(venue.name), { x: margin + 12, y, size: 12, font: regular, color: TEXT_DARK });
      const price = `Rs. ${venue.price}`;
      const priceW = bold.widthOfTextAtSize(price, 12);
      page1.drawText(price, { x: rightEdge - priceW - 12, y, size: 12, font: bold, color: TEXT_DARK });
      y -= 25;
    }
    drawLine(page1, margin, y + 12, rightEdge, y + 12, 0.8, BORDER);

    // --- 5. TOTALS BLOCK ---
    y -= 90;
    page1.drawRectangle({ x: margin, y, width: width - margin * 2, height: 100, color: BG_LIGHT, borderColor: BORDER, borderWidth: 1.2, borderRadius: 12 });
    page1.drawCircle({ x: rightEdge - 30, y: y + 25, size: 45, borderColor: ACCENT, borderWidth: 0.3, opacity: 0.15 });

    page1.drawText("GRAND TOTAL", { x: margin + 25, y: y + 68, size: 18, font: bold, color: TEXT_DARK });
    
    drawSectionIcon(page1, "document", margin + 42, y + 35, BORDER);
    page1.drawText("Advance Paid:", { x: margin + 70, y: y + 42, size: 11, font: regular, color: TEXT_MUTED });
    page1.drawText(`Rs. ${data.advanceAmount}`, { x: margin + 70, y: y + 24, size: 14, font: bold, color: TEXT_DARK });

    drawLine(page1, margin + 250, y + 18, margin + 250, y + 82, 1.2, BORDER);

    const grandTotal = `Rs. ${data.totalAmount}`;
    const gtW = bold.widthOfTextAtSize(grandTotal, 42);
    page1.drawText(grandTotal, { x: rightEdge - gtW - 25, y: y + 50, size: 42, font: bold, color: PRIMARY });

    if (data.isPaid) {
      const statusText = "FULLY PAID";
      const stW = bold.widthOfTextAtSize(statusText, 11);
      const pillW = stW + 35;
      const pillX = rightEdge - pillW - 25;
      page1.drawRectangle({ x: pillX, y: y + 18, width: pillW, height: 24, color: rgb(0.2, 0.7, 0.2), borderRadius: 12 });
      
      const checkX = pillX + 14;
      const checkY = y + 30;
      page1.drawLine({ start: { x: checkX - 5, y: checkY }, end: { x: checkX - 1, y: checkY - 4 }, thickness: 1.8, color: WHITE });
      page1.drawLine({ start: { x: checkX - 1, y: checkY - 4 }, end: { x: checkX + 5, y: checkY + 5 }, thickness: 1.8, color: WHITE });
      
      page1.drawText(statusText, { x: pillX + 25, y: y + 26, size: 11, font: bold, color: WHITE });
      page1.drawText("PAYMENT STATUS", { x: pillX + 5, y: y + 45, size: 10, font: regular, color: TEXT_MUTED });
    }

    // --- 6. SIGNATURES ---
    y -= 100;
    const sigLineW = 180;
    page1.drawText(cleanText(data.customerName), { x: margin + 50, y: y + 30, size: 20, font: regular, color: TEXT_DARK });
    drawLine(page1, margin, y + 20, margin + sigLineW, y + 20, 1, TEXT_DARK);
    page1.drawText("Customer Signature", { x: margin + 45, y: y + 5, size: 10, font: regular, color: TEXT_MUTED });

    const authX = rightEdge - sigLineW;
    page1.drawText("Bookal", { x: authX + 60, y: y + 30, size: 20, font: regular, color: TEXT_DARK });
    drawLine(page1, authX, y + 20, rightEdge, y + 20, 1, TEXT_DARK);
    page1.drawText("Authorized Signature & Stamp", { x: authX + 20, y: y + 5, size: 10, font: regular, color: TEXT_MUTED });

    // Crown Icon in Circle
    page1.drawCircle({ x: width / 2, y: y + 25, size: 20, borderColor: ACCENT, borderWidth: 1.2 });
    drawIcon(page1, "crown", width / 2, y + 25, 16, ACCENT);

    // --- 7. FOOTER ---
    const footerY = 25;
    page1.drawRectangle({ x: margin, y: footerY - 5, width: width - margin * 2, height: 30, color: BG_LIGHT, borderRadius: 5 });
    
    drawIcon(page1, "calendar", margin + 15, footerY + 10, 10, ACCENT);
    page1.drawText(`Booked by: ${data.createdBy}`, { x: margin + 30, y: footerY + 7, size: 9, font: regular, color: TEXT_MUTED });
    
    drawLine(page1, margin + 160, footerY + 5, margin + 160, footerY + 20, 0.6, BORDER);
    
    drawIcon(page1, "clock", margin + 175, footerY + 10, 10, ACCENT);
    page1.drawText(`Created: ${data.createdAt.split('T')[0]}`, { x: margin + 190, y: footerY + 7, size: 9, font: regular, color: TEXT_MUTED });
    
    const genLabel = "Generated by Bookal Management System";
    const glW = regular.widthOfTextAtSize(genLabel, 9);
    drawIcon(page1, "shield", rightEdge - glW - 30, footerY + 10, 10, ACCENT);
    page1.drawText(genLabel, { x: rightEdge - glW - 12, y: footerY + 7, size: 9, font: regular, color: TEXT_MUTED });

    return pdfDoc.save();
  } catch (err) {
    console.error("Premium PDF Error:", err);
    // Safe Fallback
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const p = doc.addPage([595, 842]);
    p.drawText("BOOKAL BOOKING RECEIPT (RECOVERY MODE)", { x: 50, y: 800, size: 16, font });
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
