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
  notes: string;
  createdBy: string;
  createdAt: string;
  business?: BusinessInfo;
}

const PRIMARY = rgb(0.49, 0.21, 0.09); // #7C3518 (Header Brown)
const ACCENT = rgb(0.78, 0.36, 0.16);  // #C75B2A (Branding Orange/Brown)
const TEXT_DARK = rgb(0.10, 0.07, 0.04); // #1A1209
const TEXT_MUTED = rgb(0.42, 0.34, 0.27); // #6B5744
const BORDER = rgb(0.91, 0.87, 0.83); // #E8DDD4
const WHITE = rgb(1, 1, 1);
const BG_LIGHT = rgb(0.99, 0.97, 0.95); // #FDF8F3

function drawLine(page: PDFPage, x1: number, y1: number, x2: number, y2: number, thickness = 0.5, color = BORDER) {
  page.drawLine({
    start: { x: x1, y: y1 },
    end: { x: x2, y: y2 },
    thickness,
    color,
  });
}

function drawSectionIcon(page: PDFPage, x: number, y: number, color = ACCENT) {
  // Simple circle icon background
  page.drawCircle({ x, y, size: 12, color, opacity: 1 });
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

export async function generatePremiumBookingPdf(data: BookingPdfData): Promise<Uint8Array> {
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
    const headerHeight = 160;
    // Main rectangle
    page1.drawRectangle({ x: 0, y: height - headerHeight, width, height: headerHeight, color: PRIMARY });
    
    // Draw the curve (overlaying with a lighter brown or path)
    page1.drawEllipse({
      x: width + 20,
      y: height - 60,
      xScale: 250,
      yScale: 200,
      color: ACCENT,
      opacity: 0.3
    });

    // Logo & Name (Left)
    // Draw Hexagon for Logo "B"
    const hexX = margin + 20;
    const hexY = height - 80;
    const s = 18; // size
    page1.drawRectangle({
      x: hexX - s/2,
      y: hexY - s/2,
      width: s,
      height: s,
      borderColor: WHITE,
      borderWidth: 2,
      rotate: { type: 'degrees', angle: 45 }
    });
    page1.drawText("B", { x: hexX - 7, y: hexY - 8, size: 20, font: bold, color: WHITE });
    
    page1.drawText(cleanText(biz.name), { x: margin + 55, y: height - 88, size: 38, font: bold, color: WHITE });
    page1.drawText(cleanText(biz.tagline), { x: margin + 57, y: height - 105, size: 12, font: regular, color: WHITE });

    // Business Info (Right)
    let bizY = height - 50;
    const bizFontSize = 9;
    const bizTextX = width - 200;

    const drawHeaderContact = (text: string, icon: string) => {
      if (!text) return;
      // Icon dot
      page1.drawCircle({ x: bizTextX - 10, y: bizY + 3, size: 2.5, color: ACCENT });
      page1.drawText(cleanText(text), { x: bizTextX, y: bizY, size: bizFontSize, font: regular, color: WHITE });
      bizY -= 15;
    };

    drawHeaderContact(biz.address, "pin");
    drawHeaderContact(biz.phone, "phone");
    drawHeaderContact(biz.email, "mail");
    if (biz.gst) drawHeaderContact(`GST: ${biz.gst}`, "file");

    // Reference Badge
    const refLabel = `REF: ${data.bookingRef}`;
    const refW = bold.widthOfTextAtSize(refLabel, 10);
    page1.drawRectangle({ x: rightEdge - refW - 20, y: height - 145, width: refW + 20, height: 22, color: ACCENT, borderRadius: 4 });
    page1.drawText(refLabel, { x: rightEdge - refW - 10, y: height - 138, size: 10, font: bold, color: WHITE });

    // --- 2. TITLE & SEPARATOR ---
    let y = height - 200;
    const title = "BOOKING RECEIPT";
    const titleW = bold.widthOfTextAtSize(title, 24);
    page1.drawText(title, { x: (width - titleW) / 2, y, size: 24, font: bold, color: TEXT_DARK });
    
    y -= 15;
    // Diamond Separator
    const sepX = width / 2;
    drawLine(page1, margin + 40, y, sepX - 20, y, 0.5, BORDER);
    drawLine(page1, sepX + 20, y, rightEdge - 40, y, 0.5, BORDER);
    page1.drawRectangle({
      x: sepX - 3,
      y: y - 3,
      width: 6,
      height: 6,
      color: ACCENT,
      rotate: { type: 'degrees', angle: 45 }
    });

    // --- 3. INFORMATION CARDS ---
    y -= 60;
    const cardW = (width - margin * 2 - 20) / 2;
    const cardH = 150;
    
    // Client Info Card
    page1.drawRectangle({ x: margin, y: y - cardH, width: cardW, height: cardH, borderColor: BORDER, borderWidth: 1, borderRadius: 8 });
    drawSectionIcon(page1, margin + 20, y);
    page1.drawText("CLIENT INFORMATION", { x: margin + 40, y: y - 4, size: 10, font: bold, color: ACCENT });
    
    // Event Schedule Card
    const col2X = margin + cardW + 20;
    page1.drawRectangle({ x: col2X, y: y - cardH, width: cardW, height: cardH, borderColor: BORDER, borderWidth: 1, borderRadius: 8 });
    drawSectionIcon(page1, col2X + 20, y);
    page1.drawText("EVENT SCHEDULE", { x: col2X + 40, y: y - 4, size: 10, font: bold, color: ACCENT });

    // Populate Cards
    let cardY = y - 35;
    const labelSize = 9;
    const valueSize = 10;

    // Card 1 Details
    const drawCard1Row = (label: string, value: string) => {
      page1.drawText(label, { x: margin + 15, y: cardY, size: labelSize, font: regular, color: TEXT_MUTED });
      page1.drawText(cleanText(value), { x: margin + 95, y: cardY, size: valueSize, font: bold, color: TEXT_DARK });
      cardY -= 25;
    };
    drawCard1Row("Customer Name", data.customerName);
    drawCard1Row("Phone", data.phones);
    // Address with wrap in card
    page1.drawText("Address", { x: margin + 15, y: cardY, size: labelSize, font: regular, color: TEXT_MUTED });
    const addrLines = wrapText(data.address, cardW - 110, regular, valueSize);
    addrLines.slice(0, 3).forEach((line, i) => {
      page1.drawText(cleanText(line), { x: margin + 95, y: cardY - (i * 12), size: valueSize, font: bold, color: TEXT_DARK });
    });

    // Card 2 Details
    cardY = y - 35;
    const drawCard2Row = (label: string, value: string) => {
      page1.drawText(label, { x: col2X + 15, y: cardY, size: labelSize, font: regular, color: TEXT_MUTED });
      page1.drawText(cleanText(value), { x: col2X + 90, y: cardY, size: valueSize, font: bold, color: TEXT_DARK });
      cardY -= 25;
    };
    drawCard2Row("Date", data.bookingDate);
    drawCard2Row("Tamil Date", data.tamilDate);
    drawCard2Row("Time", `${data.startTime} - ${data.endTime}`);
    drawCard2Row("Duration", `${data.duration} hours`);

    // --- 4. VENUE & PRICING TABLE ---
    y -= (cardH + 40);
    drawSectionIcon(page1, margin + 15, y);
    page1.drawText("VENUE & PRICING", { x: margin + 35, y: y - 4, size: 10, font: bold, color: ACCENT });
    
    y -= 25;
    page1.drawRectangle({ x: margin, y: y - 20, width: width - margin * 2, height: 20, color: BG_LIGHT });
    page1.drawText("Description", { x: margin + 10, y: y - 13, size: 9, font: bold, color: ACCENT });
    page1.drawText("Subtotal (Rs.)", { x: rightEdge - 80, y: y - 13, size: 9, font: bold, color: ACCENT });
    
    y -= 40;
    for (const venue of data.venues) {
      page1.drawText(cleanText(venue.name), { x: margin + 10, y, size: 11, font: regular, color: TEXT_DARK });
      const price = `Rs. ${venue.price}`;
      const priceW = bold.widthOfTextAtSize(price, 11);
      page1.drawText(price, { x: rightEdge - priceW - 10, y, size: 11, font: bold, color: TEXT_DARK });
      y -= 20;
    }
    drawLine(page1, margin, y + 10, rightEdge, y + 10, 0.5, BORDER);

    // --- 5. TOTALS BLOCK (GLASSMORPHISM STYLE) ---
    y -= 80;
    page1.drawRectangle({ 
      x: margin, y, width: width - margin * 2, height: 90, 
      color: BG_LIGHT, borderColor: BORDER, borderWidth: 1, borderRadius: 10 
    });
    // Add a soft circular pattern for texture (matching image)
    page1.drawCircle({ x: rightEdge - 20, y: y + 20, size: 40, borderColor: ACCENT, borderWidth: 0.2, opacity: 0.1 });

    page1.drawText("GRAND TOTAL", { x: margin + 20, y: y + 60, size: 16, font: bold, color: TEXT_DARK });
    
    // Advance Section
    drawSectionIcon(page1, margin + 35, y + 30, BORDER);
    page1.drawText("Advance Paid:", { x: margin + 60, y: y + 35, size: 10, font: regular, color: TEXT_MUTED });
    page1.drawText(`Rs. ${data.advanceAmount}`, { x: margin + 60, y: y + 18, size: 13, font: bold, color: TEXT_DARK });

    // Vertical Divider
    drawLine(page1, margin + 230, y + 15, margin + 230, y + 75, 1, BORDER);

    // Final Amount (Huge)
    const grandTotal = `Rs. ${data.totalAmount}`;
    const gtW = bold.widthOfTextAtSize(grandTotal, 36);
    page1.drawText(grandTotal, { x: rightEdge - gtW - 20, y: y + 45, size: 36, font: bold, color: PRIMARY });

    // Payment Status Pill
    if (data.isPaid) {
      const statusText = "FULLY PAID";
      const stW = bold.widthOfTextAtSize(statusText, 10);
      const pillW = stW + 30;
      const pillX = rightEdge - pillW - 20;
      page1.drawRectangle({ x: pillX, y: y + 15, width: pillW, height: 20, color: rgb(0.2, 0.7, 0.2), borderRadius: 10 });
      
      // Draw manual checkmark
      const checkX = pillX + 12;
      const checkY = y + 25;
      page1.drawLine({ start: { x: checkX - 4, y: checkY }, end: { x: checkX - 1, y: checkY - 3 }, thickness: 1.5, color: WHITE });
      page1.drawLine({ start: { x: checkX - 1, y: checkY - 3 }, end: { x: checkX + 4, y: checkY + 4 }, thickness: 1.5, color: WHITE });
      
      page1.drawText(statusText, { x: pillX + 22, y: y + 21, size: 10, font: bold, color: WHITE });
      page1.drawText("PAYMENT STATUS", { x: pillX + 2, y: y + 38, size: 9, font: regular, color: TEXT_MUTED });
    }

    // --- 6. SIGNATURES ---
    y -= 80;
    const sigLineW = 160;
    // Customer Sig
    page1.drawText(cleanText(data.customerName), { x: margin + 40, y: y + 25, size: 18, font: regular, color: TEXT_DARK }); // Placeholder for script font
    drawLine(page1, margin, y + 15, margin + sigLineW, y + 15, 0.8, TEXT_DARK);
    page1.drawText("Customer Signature", { x: margin + 35, y: y, size: 9, font: regular, color: TEXT_MUTED });

    // Authorized Sig
    const authX = rightEdge - sigLineW;
    page1.drawText("Bookal", { x: authX + 50, y: y + 25, size: 18, font: regular, color: TEXT_DARK });
    drawLine(page1, authX, y + 15, rightEdge, y + 15, 0.8, TEXT_DARK);
    page1.drawText("Authorized Signature & Stamp", { x: authX + 15, y: y, size: 9, font: regular, color: TEXT_MUTED });

    // Stamp Circle
    page1.drawCircle({ x: width / 2, y: y + 20, size: 15, borderColor: ACCENT, borderWidth: 1 });
    page1.drawCircle({ x: width / 2, y: y + 20, size: 12, borderColor: ACCENT, borderWidth: 0.5 });

    // --- 7. FOOTER ---
    const footerY = 25;
    page1.drawRectangle({ x: margin, y: footerY - 5, width: width - margin * 2, height: 25, color: BG_LIGHT, borderRadius: 4 });
    
    page1.drawText(`Booked by: ${data.createdBy}`, { x: margin + 10, y: footerY + 6, size: 8, font: regular, color: TEXT_MUTED });
    drawLine(page1, margin + 130, footerY + 5, margin + 130, footerY + 15, 0.5, BORDER);
    page1.drawText(`Created: ${data.createdAt.split('T')[0]}`, { x: margin + 145, y: footerY + 6, size: 8, font: regular, color: TEXT_MUTED });
    
    const genLabel = "Generated by Bookal Management System";
    const glW = regular.widthOfTextAtSize(genLabel, 8);
    page1.drawText(genLabel, { x: rightEdge - glW - 10, y: footerY + 6, size: 8, font: regular, color: TEXT_MUTED });

    return pdfDoc.save();
  } catch (err) {
    console.error("Premium PDF Error:", err);
    // Safe Fallback
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const p = doc.addPage([595, 842]);
    p.drawText("BOOKAL BOOKING RECEIPT (RECOVERY MODE)", { x: 50, y: 800, size: 16, font });
    p.drawText(`Ref: ${data.bookingRef}`, { x: 50, y: 770, size: 12, font });
    p.drawText(`Customer: ${cleanText(data.customerName)}`, { x: 50, y: 750, size: 12, font });
    return doc.save();
  }
}

export async function mergePdfs(pdfBuffers: Uint8Array[]): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();
  for (const pdfBuffer of pdfBuffers) {
    try {
      const pdf = await PDFDocument.load(pdfBuffer);
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    } catch (err) {
      console.error("Error merging PDF chunk:", err);
      // Skip invalid PDFs instead of failing entire merge
    }
  }
  return mergedPdf.save();
}

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
