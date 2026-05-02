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

const PRIMARY = rgb(0.78, 0.36, 0.16); // #C75B2A
const TEXT_DARK = rgb(0.10, 0.07, 0.04); // #1A1209
const TEXT_MUTED = rgb(0.42, 0.34, 0.27); // #6B5744
const BORDER = rgb(0.91, 0.87, 0.83); // #E8DDD4
const WHITE = rgb(1, 1, 1);
const BG_LIGHT = rgb(0.99, 0.97, 0.95); // #FDF8F3

function drawLine(page: PDFPage, x1: number, y1: number, x2: number, y2: number, thickness = 0.5) {
  page.drawLine({
    start: { x: x1, y: y1 },
    end: { x: x2, y: y2 },
    thickness,
    color: BORDER,
  });
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
      tagline: "Professional Venue Management",
      address: "1/85 Zamin Kottampatti, Pollachi, TN 642123",
      phone: "+91 88257 02072",
      email: "bookings@bookal.app",
      gst: ""
    };

    const margin = 45;
    const rightEdge = width - margin;

    // --- HEADER: PREMIUM BRANDING ---
    page1.drawRectangle({ x: 0, y: height - 120, width, height: 120, color: PRIMARY });

    // Left side: Logo/Name
    page1.drawText(cleanText(biz.name), {
      x: margin, y: height - 50, size: 26, font: bold, color: WHITE,
    });
    page1.drawText(cleanText(biz.tagline), {
      x: margin, y: height - 68, size: 11, font: regular, color: WHITE,
    });
    
    // Right side: Business Contact Info
    let bizY = height - 40;
    const bizFontSize = 8.5;
    const bizTextX = width / 2 + 30;

    const drawBizInfo = (text: string, icon: string = "") => {
      if (!text) return;
      page1.drawText(cleanText(text), {
        x: bizTextX, y: bizY, size: bizFontSize, font: regular, color: WHITE,
      });
      bizY -= 14;
    };

    drawBizInfo(biz.address);
    drawBizInfo(`P: ${biz.phone} | E: ${biz.email}`);
    if (biz.gst) drawBizInfo(`GST: ${biz.gst}`);
    
    // Reference Badge
    page1.drawRectangle({ x: rightEdge - 140, y: height - 105, width: 140, height: 24, color: WHITE, opacity: 0.15 });
    page1.drawText(`REF: ${data.bookingRef}`, {
      x: rightEdge - 130, y: height - 98, size: 11, font: bold, color: WHITE,
    });

    // --- SECTION: BOOKING RECEIPT TITLE ---
    let y = height - 150;
    page1.drawText("BOOKING RECEIPT", { x: margin, y, size: 18, font: bold, color: PRIMARY });
    y -= 12;
    drawLine(page1, margin, y, rightEdge, y, 1);
    
    // --- GRID: CLIENT & EVENT INFO ---
    y -= 35;
    const col2X = width / 2 + 10;
    const sectionTitleSize = 9;
    const infoLabelSize = 9;
    const infoValueSize = 10;
    
    page1.drawText("CLIENT INFORMATION", { x: margin, y, size: sectionTitleSize, font: bold, color: PRIMARY });
    page1.drawText("EVENT SCHEDULE", { x: col2X, y, size: sectionTitleSize, font: bold, color: PRIMARY });
    y -= 25;
    
    // Customer Name
    page1.drawText("Customer Name", { x: margin, y, size: infoLabelSize, font: regular, color: TEXT_MUTED });
    page1.drawText(cleanText(data.customerName), { x: margin + 90, y, size: infoValueSize, font: bold, color: TEXT_DARK });
    
    // Date
    page1.drawText("Date", { x: col2X, y, size: infoLabelSize, font: regular, color: TEXT_MUTED });
    page1.drawText(cleanText(data.bookingDate), { x: col2X + 80, y, size: infoValueSize, font: bold, color: TEXT_DARK });
    y -= 20;

    // Phone
    page1.drawText("Phone", { x: margin, y, size: infoLabelSize, font: regular, color: TEXT_MUTED });
    page1.drawText(cleanText(data.phones), { x: margin + 90, y, size: infoValueSize, font: bold, color: TEXT_DARK });
    
    // Tamil Date
    page1.drawText("Tamil Date", { x: col2X, y, size: infoLabelSize, font: regular, color: TEXT_MUTED });
    page1.drawText(cleanText(data.tamilDate), { x: col2X + 80, y, size: infoValueSize, font: bold, color: TEXT_DARK });
    y -= 20;

    // Address (with Wrapping)
    page1.drawText("Address", { x: margin, y, size: infoLabelSize, font: regular, color: TEXT_MUTED });
    const addrLines = wrapText(data.address, 180, regular, infoValueSize);
    let addrY = y;
    addrLines.forEach(line => {
      page1.drawText(cleanText(line), { x: margin + 90, y: addrY, size: infoValueSize, font: bold, color: TEXT_DARK });
      addrY -= 14;
    });

    // Time & Duration
    page1.drawText("Time", { x: col2X, y, size: infoLabelSize, font: regular, color: TEXT_MUTED });
    page1.drawText(`${data.startTime} - ${data.endTime}`, { x: col2X + 80, y, size: infoValueSize, font: bold, color: TEXT_DARK });
    y -= 20;
    page1.drawText("Duration", { x: col2X, y, size: infoLabelSize, font: regular, color: TEXT_MUTED });
    page1.drawText(`${data.duration} hours`, { x: col2X + 80, y, size: infoValueSize, font: bold, color: TEXT_DARK });
    
    // Adjust y based on address lines
    y = Math.min(y - 20, addrY - 15);
    
    // --- VENUES & PRICING ---
    page1.drawText("VENUE & PRICING", { x: margin, y, size: sectionTitleSize, font: bold, color: PRIMARY });
    y -= 10;
    drawLine(page1, margin, y, rightEdge, y, 0.5);
    y -= 18;
    
    page1.drawText("Description", { x: margin, y, size: 8, font: bold, color: TEXT_MUTED });
    const subW = regular.widthOfTextAtSize("Subtotal (Rs.)", 8);
    page1.drawText("Subtotal (Rs.)", { x: rightEdge - subW, y, size: 8, font: bold, color: TEXT_MUTED });
    y -= 15;
    drawLine(page1, margin, y, rightEdge, y, 0.2);
    y -= 20;

    for (const venue of data.venues) {
      page1.drawText(cleanText(venue.name), { x: margin, y, size: 10, font: regular, color: TEXT_DARK });
      const subtotal = `Rs. ${venue.price}`;
      const priceW = bold.widthOfTextAtSize(subtotal, 10);
      page1.drawText(subtotal, { x: rightEdge - priceW, y, size: 10, font: bold, color: TEXT_DARK });
      y -= 18;
    }

    y -= 10;
    drawLine(page1, margin, y, rightEdge, y, 0.5);
    y -= 25;

    // Totals Section
    const totalLabel = "GRAND TOTAL";
    page1.drawText(totalLabel, { x: margin, y, size: 15, font: bold, color: TEXT_DARK });
    const totalVal = `Rs. ${data.totalAmount}`;
    const totalValW = bold.widthOfTextAtSize(totalVal, 16);
    page1.drawText(totalVal, { x: rightEdge - totalValW, y, size: 16, font: bold, color: PRIMARY });
    
    y -= 22;
    page1.drawText("Advance Paid:", { x: margin, y, size: 10, font: regular, color: TEXT_MUTED });
    const advVal = `Rs. ${data.advanceAmount}`;
    const advValW = bold.widthOfTextAtSize(advVal, 10);
    page1.drawText(advVal, { x: rightEdge - advValW, y, size: 10, font: bold, color: TEXT_DARK });
    
    y -= 20;
    const totalNum = parseFloat(String(data.totalAmount).replace(/,/g, '')) || 0;
    const advNum = parseFloat(String(data.advanceAmount).replace(/,/g, '')) || 0;
    const balDue = `Rs. ${(totalNum - advNum).toLocaleString('en-IN')}`;
    const balDueW = bold.widthOfTextAtSize(balDue, 16);
    
    page1.drawText(data.isPaid ? "PAYMENT STATUS:" : "BALANCE DUE:", { x: margin, y, size: 11, font: bold, color: TEXT_DARK });
    page1.drawText(data.isPaid ? "FULLY PAID" : balDue, { x: rightEdge - balDueW, y, size: 16, font: bold, color: data.isPaid ? rgb(0.1, 0.6, 0.1) : PRIMARY });

    // --- NOTES ---
    if (data.notes) {
      y -= 35;
      page1.drawText("NOTES", { x: margin, y, size: 9, font: bold, color: PRIMARY });
      y -= 16;
      const notesLines = wrapText(data.notes, 480, regular, 9);
      notesLines.forEach(line => {
        page1.drawText(cleanText(line), { x: margin, y, size: 9, font: regular, color: TEXT_DARK });
        y -= 13;
      });
    }

    // --- SIGNATURE SECTION (BOTTOM) ---
    const sigY = 120;
    drawLine(page1, margin, sigY, rightEdge, sigY, 0.5);
    
    // Customer Sig
    const sigLineY = sigY - 60;
    drawLine(page1, margin, sigLineY, margin + 180, sigLineY, 0.5);
    page1.drawText("Customer Signature", { x: margin + 35, y: sigLineY - 14, size: 8, font: regular, color: TEXT_MUTED });
    
    // Authorized Sig
    drawLine(page1, rightEdge - 180, sigLineY, rightEdge, sigLineY, 0.5);
    page1.drawText("Authorized Signature & Stamp", { x: rightEdge - 165, y: sigLineY - 14, size: 8, font: regular, color: TEXT_MUTED });

    // --- FOOTER ---
    const footerY = 25;
    page1.drawText(cleanText(`Booked by: ${data.createdBy}  |  Created: ${data.createdAt.split('T')[0]}`), {
      x: margin, y: footerY, size: 7.5, font: regular, color: TEXT_MUTED,
    });
    const siteLabel = "Generated by Bookal Management System";
    const siteW = regular.widthOfTextAtSize(siteLabel, 7.5);
    page1.drawText(siteLabel, { x: rightEdge - siteW, y: footerY, size: 7.5, font: regular, color: TEXT_MUTED });

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
