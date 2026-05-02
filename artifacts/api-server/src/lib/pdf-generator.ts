/**
 * Professional PDF Generator for Bookal using pdf-lib.
 * Generates a branded, high-fidelity receipt (Page 1) and rules/conditions (Page 2).
 */
import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from "pdf-lib";

export interface BusinessInfo {
  name: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
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

function cleanText(str: string): string {
  if (!str) return "";
  // Strip non-ASCII to prevent PDF-lib standard font crashes
  return str.replace(/[^\x00-\x7F]/g, "");
}

function drawLabelValue(page: PDFPage, label: string, value: string, x: number, y: number, regular: PDFFont, bold: PDFFont) {
  page.drawText(label, { x, y, size: 9, font: regular, color: TEXT_MUTED });
  page.drawText(cleanText(value) || "-", { x: x + 110, y, size: 9.5, font: bold, color: TEXT_DARK });
}

export async function generatePremiumBookingPdf(data: BookingPdfData): Promise<Uint8Array> {
  const biz = data.business || {
    name: "BOOKAL VENUES",
    tagline: "Venue Booking Made Simple",
    address: "Tamil Nadu, India",
    phone: "+91 98765 43210",
    email: "contact@bookal.app",
    gst: "",
  };

  const pdfDoc = await PDFDocument.create();
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // ===== PAGE 1: RECEIPT =====
  const page1 = pdfDoc.addPage([595, 842]); // A4
  const { width, height } = page1.getSize();
  const margin = 45;
  const rightEdge = width - margin;

  // --- HEADER BLOCK ---
  page1.drawRectangle({ x: 0, y: height - 90, width, height: 90, color: PRIMARY });

  page1.drawText(cleanText(biz.name).toUpperCase(), {
    x: margin, y: height - 38, size: 22, font: bold, color: WHITE,
  });
  page1.drawText(cleanText(biz.tagline), {
    x: margin, y: height - 55, size: 10, font: regular, color: rgb(1, 0.92, 0.87),
  });
  if (biz.gst) {
    page1.drawText(`GST: ${biz.gst}`, {
      x: margin, y: height - 72, size: 8, font: regular, color: rgb(1, 0.85, 0.78),
    });
  }

  // Ref on the right side of the header
  const refLabel = cleanText(`Ref: ${data.bookingRef}`);
  const refWidth = bold.widthOfTextAtSize(refLabel, 12);
  page1.drawText(refLabel, {
    x: rightEdge - refWidth, y: height - 40, size: 12, font: bold, color: WHITE,
  });

  // --- RECEIPT TITLE ---
  let y = height - 120;
  page1.drawText("BOOKING RECEIPT", { x: margin, y, size: 16, font: bold, color: PRIMARY });
  y -= 8;
  drawLine(page1, margin, y, rightEdge, y, 1);

  // --- CLIENT INFO ---
  y -= 22;
  page1.drawText("CLIENT INFORMATION", { x: margin, y, size: 9, font: bold, color: PRIMARY });
  y -= 20;
  drawLabelValue(page1, "Customer Name", data.customerName, margin, y, regular, bold);
  y -= 18;
  drawLabelValue(page1, "Phone", data.phones, margin, y, regular, bold);
  y -= 18;
  drawLabelValue(page1, "Address", data.address, margin, y, regular, bold);

  // --- EVENT SCHEDULE (right column) ---
  const col2X = 330;
  let y2 = height - 142;
  page1.drawText("EVENT SCHEDULE", { x: col2X, y: y2, size: 9, font: bold, color: PRIMARY });
  y2 -= 20;
  drawLabelValue(page1, "Date", data.bookingDate, col2X, y2, regular, bold);
  y2 -= 18;
  if (data.tamilDate) {
    drawLabelValue(page1, "Tamil Date", data.tamilDate, col2X, y2, regular, bold);
    y2 -= 18;
  }
  drawLabelValue(page1, "Time", `${data.startTime} - ${data.endTime}`, col2X, y2, regular, bold);
  y2 -= 18;
  drawLabelValue(page1, "Duration", `${data.duration} hours`, col2X, y2, regular, bold);

  // --- SEPARATOR ---
  y = Math.min(y, y2) - 20;
  drawLine(page1, margin, y, rightEdge, y, 0.8);

  // --- VENUE & PRICING TABLE ---
  y -= 22;
  page1.drawText("VENUE & PRICING", { x: margin, y, size: 9, font: bold, color: PRIMARY });
  y -= 5;
  drawLine(page1, margin, y, rightEdge, y, 0.5);

  // Table header
  y -= 18;
  page1.drawText("Description", { x: margin, y, size: 8.5, font: bold, color: TEXT_MUTED });
  const amtHeaderW = bold.widthOfTextAtSize("Subtotal (Rs.)", 8.5);
  page1.drawText("Subtotal (Rs.)", { x: rightEdge - amtHeaderW, y, size: 8.5, font: bold, color: TEXT_MUTED });
  y -= 4;
  drawLine(page1, margin, y, rightEdge, y, 0.3);

  // Venue rows
  for (const v of data.venues) {
    y -= 20;
    page1.drawText(cleanText(v.name), { x: margin, y, size: 10, font: regular, color: TEXT_DARK });
    const amtW = bold.widthOfTextAtSize(`Rs. ${v.price}`, 10);
    page1.drawText(`Rs. ${v.price}`, { x: rightEdge - amtW, y, size: 10, font: bold, color: TEXT_DARK });
  }

  // Total line
  y -= 15;
  drawLine(page1, margin, y, rightEdge, y, 1);
  y -= 22;
  page1.drawText("GRAND TOTAL", { x: margin, y, size: 13, font: bold, color: TEXT_DARK });
  const totalLabel = cleanText(`Rs. ${data.totalAmount}`);
  const totalW = bold.widthOfTextAtSize(totalLabel, 15);
  page1.drawText(totalLabel, { x: rightEdge - totalW, y, size: 15, font: bold, color: PRIMARY });

  y -= 25;
  const advanceLabel = "Advance Paid:";
  page1.drawText(advanceLabel, { x: margin, y, size: 10, font: regular, color: TEXT_MUTED });
  const advVal = cleanText(`Rs. ${data.advanceAmount}`);
  const advW = bold.widthOfTextAtSize(advVal, 10);
  page1.drawText(advVal, { x: rightEdge - advW, y, size: 10, font: bold, color: TEXT_DARK });

  y -= 20;
  const statusLabel = data.isPaid ? "PAYMENT STATUS:" : "BALANCE DUE:";
  page1.drawText(statusLabel, { x: margin, y, size: 11, font: bold, color: TEXT_DARK });
  
  // For balance calculation, we need numbers
  const totalNum = parseFloat(String(data.totalAmount).replace(/,/g, '')) || 0;
  const advNum = parseFloat(String(data.advanceAmount).replace(/,/g, '')) || 0;
  const balRaw = data.isPaid ? "FULLY PAID" : `Rs. ${(totalNum - advNum).toLocaleString('en-IN')}`;
  const balVal = cleanText(balRaw);
  const balW = bold.widthOfTextAtSize(balVal, 12);
  page1.drawText(balVal, { x: rightEdge - balW, y, size: 12, font: bold, color: data.isPaid ? rgb(0.1, 0.6, 0.1) : PRIMARY });

  // --- NOTES ---
  y -= 35;
  if (data.notes) {
    page1.drawText("NOTES", { x: margin, y, size: 9, font: bold, color: PRIMARY });
    y -= 16;
    // Word-wrap notes to max 80 chars per line
    const maxChars = 80;
    const noteLines = [];
    let remaining = cleanText(data.notes);
    while (remaining.length > maxChars) {
      let breakAt = remaining.lastIndexOf(" ", maxChars);
      if (breakAt === -1) breakAt = maxChars;
      noteLines.push(remaining.substring(0, breakAt));
      remaining = remaining.substring(breakAt + 1);
    }
    noteLines.push(remaining);
    for (const line of noteLines) {
      page1.drawText(line, { x: margin, y, size: 9, font: regular, color: TEXT_DARK });
      y -= 14;
    }
  }

  // --- FOOTER ---
  const footerY = 85;
  drawLine(page1, margin, footerY + 20, rightEdge, footerY + 20, 0.5);

  page1.drawText(cleanText(`Booked by: ${data.createdBy}  |  Created: ${new Date(data.createdAt).toLocaleString("en-IN")}`), {
    x: margin, y: footerY + 6, size: 7.5, font: regular, color: TEXT_MUTED,
  });
  page1.drawText(cleanText(biz.address), {
    x: margin, y: footerY - 8, size: 7.5, font: regular, color: TEXT_MUTED,
  });
  page1.drawText(cleanText(`P: ${biz.phone} | E: ${biz.email}`), {
    x: margin, y: footerY - 20, size: 7.5, font: regular, color: TEXT_MUTED,
  });

  const pageNumW = regular.widthOfTextAtSize("Page 1/2", 7.5);
  page1.drawText("Page 1/2", {
    x: rightEdge - pageNumW, y: footerY - 20, size: 7.5, font: regular, color: TEXT_MUTED,
  });

  // --- SIGNATURE LINES ---
  const sigY = 48;
  drawLine(page1, margin, sigY, margin + 160, sigY, 0.5);
  page1.drawText("Customer Signature", {
    x: margin + 30, y: sigY - 14, size: 7.5, font: regular, color: TEXT_MUTED,
  });
  drawLine(page1, rightEdge - 160, sigY, rightEdge, sigY, 0.5);
  page1.drawText("Authorized Signature & Stamp", {
    x: rightEdge - 155, y: sigY - 14, size: 7.5, font: regular, color: TEXT_MUTED,
  });

  // ===== PAGE 2: TERMS & CONDITIONS =====
  const page2 = pdfDoc.addPage([595, 842]);
  const w2 = page2.getSize().width;
  const h2 = page2.getSize().height;
  const m2 = 45;
  const r2 = w2 - m2;

  // Header bar
  page2.drawRectangle({ x: 0, y: h2 - 60, width: w2, height: 60, color: PRIMARY });
  page2.drawText("TERMS & CONDITIONS", {
    x: m2, y: h2 - 40, size: 18, font: bold, color: WHITE,
  });

  const rules = [
    "BOOKING ADVANCE: 50% of the total amount must be paid to confirm the booking slot.",
    "FINAL PAYMENT: Remaining balance is due exactly 7 days prior to the event date.",
    "CANCELLATION: No refund if cancelled within 15 days of event. 50% refund if cancelled 30+ days before.",
    "ELECTRICITY: AC usage charges are calculated as per actual meter readings, billed separately.",
    "CLEANING: A mandatory cleaning fee of Rs. 1,000 is included in every booking.",
    "DECORATIONS: Strictly no nails, tape, or permanent markings on walls, pillars, or ceilings.",
    "MUSIC/SOUND: Volume must adhere to legal limits; no loud music permitted after 10:00 PM.",
    "DAMAGES: Any property damage will be billed directly to the primary customer on the booking.",
    "VALUABLES: Management is not responsible for loss of personal cash, jewelry, or other valuables.",
    "LIQUOR: Consumption of alcohol is strictly prohibited within the venue premises.",
  ];

  let ry = h2 - 90;
  for (let i = 0; i < rules.length; i++) {
    page2.drawText(`${i + 1}.`, { x: m2, y: ry, size: 10, font: bold, color: PRIMARY });

    // Word-wrap each rule
    const maxW = 75;
    let text = rules[i]!;
    const lines: string[] = [];
    while (text.length > maxW) {
      let breakAt = text.lastIndexOf(" ", maxW);
      if (breakAt === -1) breakAt = maxW;
      lines.push(text.substring(0, breakAt));
      text = text.substring(breakAt + 1);
    }
    lines.push(text);

    for (const line of lines) {
      page2.drawText(line, { x: m2 + 22, y: ry, size: 9.5, font: regular, color: TEXT_DARK });
      ry -= 15;
    }
    ry -= 8;
  }

  // Acknowledgement
  ry -= 15;
  page2.drawText("ACKNOWLEDGEMENT", { x: m2, y: ry, size: 10, font: bold, color: PRIMARY });
  ry -= 18;
  page2.drawText("I have read and agree to follow all the rules and conditions mentioned above.", {
    x: m2, y: ry, size: 9.5, font: regular, color: TEXT_DARK,
  });

  // Signature
  ry -= 50;
  drawLine(page2, m2, ry, m2 + 200, ry, 0.5);
  page2.drawText("Customer Signature", { x: m2 + 50, y: ry - 14, size: 8, font: regular, color: TEXT_MUTED });

  drawLine(page2, r2 - 150, ry, r2, ry, 0.5);
  page2.drawText("Date", { x: r2 - 120, y: ry - 14, size: 8, font: regular, color: TEXT_MUTED });

  // Page 2 footer
  drawLine(page2, m2, 70, r2, 70, 0.5);
  page2.drawText(biz.name, { x: m2, y: 55, size: 7.5, font: regular, color: TEXT_MUTED });
  const p2numW = regular.widthOfTextAtSize("Page 2/2", 7.5);
  page2.drawText("Page 2/2", { x: r2 - p2numW, y: 55, size: 7.5, font: regular, color: TEXT_MUTED });

  return pdfDoc.save();
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
  page.drawText(`Bookal Financial Report  |  Generated: ${new Date().toLocaleString()}`, {
    x: margin, y: footerY + 6, size: 7.5, font: regular, color: TEXT_MUTED,
  });

  return pdfDoc.save();
}
