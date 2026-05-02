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

function cleanText(val: any): string {
  if (val === null || val === undefined) return "";
  // Strip ALL non-ASCII and ALL control characters (like newlines) to prevent PDF-lib crashes
  return String(val)
    .replace(/[^\x20-\x7E]/g, "") // Keep only printable ASCII (space to tilde)
    .trim();
}

function drawLabelValue(page: PDFPage, label: string, value: string, x: number, y: number, regular: PDFFont, bold: PDFFont) {
  const cleanedVal = cleanText(value) || "-";
  page.drawText(label, { x, y, size: 9, font: regular, color: TEXT_MUTED });
  page.drawText(cleanedVal, { x: x + 110, y, size: 9.5, font: bold, color: TEXT_DARK });
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
      address: "Tamil Nadu, India",
      phone: "",
      email: ""
    };

    const margin = 45;
    const rightEdge = width - margin;

    // --- HEADER BLOCK ---
    page1.drawRectangle({ x: 0, y: height - 90, width, height: 90, color: PRIMARY });

    const titleLabel = cleanText(biz.name);
    page1.drawText(titleLabel, {
      x: margin, y: height - 40, size: 24, font: bold, color: WHITE,
    });
    const taglineLabel = cleanText(biz.tagline);
    page1.drawText(taglineLabel, {
      x: margin, y: height - 55, size: 10, font: regular, color: WHITE,
    });
    
    const refW = bold.widthOfTextAtSize(data.bookingRef, 12);
    page1.drawText(`Ref: ${data.bookingRef}`, {
      x: rightEdge - refW - 30, y: height - 40, size: 12, font: bold, color: WHITE,
    });

    // --- SECTION: BOOKING RECEIPT ---
    let y = height - 120;
    page1.drawText("BOOKING RECEIPT", { x: margin, y, size: 16, font: bold, color: PRIMARY });
    y -= 10;
    drawLine(page1, margin, y, rightEdge, y, 0.5);
    
    // Grid layout
    const col2X = width / 2 + 10;
    let y2 = y - 25;
    
    page1.drawText("CLIENT INFORMATION", { x: margin, y: y2, size: 9, font: bold, color: PRIMARY });
    page1.drawText("EVENT SCHEDULE", { x: col2X, y: y2, size: 9, font: bold, color: PRIMARY });
    y2 -= 20;
    
    drawLabelValue(page1, "Customer Name", data.customerName, margin, y2, regular, bold);
    drawLabelValue(page1, "Date", data.bookingDate, col2X, y2, regular, bold);
    y2 -= 18;
    
    drawLabelValue(page1, "Phone", data.phones, margin, y2, regular, bold);
    drawLabelValue(page1, "Tamil Date", data.tamilDate, col2X, y2, regular, bold);
    y2 -= 18;
    
    drawLabelValue(page1, "Address", data.address, margin, y2, regular, bold);
    drawLabelValue(page1, "Time", `${data.startTime} - ${data.endTime}`, col2X, y2, regular, bold);
    y2 -= 18;
    drawLabelValue(page1, "Duration", `${data.duration} hours`, col2X, y2, regular, bold);
    
    y = y2 - 30;
    
    // --- VENUES & PRICING ---
    page1.drawText("VENUE & PRICING", { x: margin, y, size: 9, font: bold, color: PRIMARY });
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
      page1.drawText(cleanText(venue.name), { x: margin, y, size: 9.5, font: regular, color: TEXT_DARK });
      const subtotal = `Rs. ${venue.price}`;
      const priceW = bold.widthOfTextAtSize(subtotal, 9.5);
      page1.drawText(subtotal, { x: rightEdge - priceW, y, size: 9.5, font: bold, color: TEXT_DARK });
      y -= 18;
    }

    y -= 10;
    drawLine(page1, margin, y, rightEdge, y, 0.5);
    y -= 25;

    // Totals
    const totalLabel = "GRAND TOTAL";
    const totalW = bold.widthOfTextAtSize(totalLabel, 15);
    page1.drawText(totalLabel, { x: margin, y, size: 15, font: bold, color: TEXT_DARK });
    
    const totalVal = `Rs. ${data.totalAmount}`;
    const totalValW = bold.widthOfTextAtSize(totalVal, 15);
    page1.drawText(totalVal, { x: rightEdge - totalValW, y, size: 15, font: bold, color: PRIMARY });
    
    y -= 22;
    const advVal = `Rs. ${data.advanceAmount}`;
    const advValW = regular.widthOfTextAtSize(advVal, 9.5);
    page1.drawText("Advance Paid:", { x: margin, y, size: 9.5, font: regular, color: TEXT_MUTED });
    page1.drawText(advVal, { x: rightEdge - advValW, y, size: 9.5, font: bold, color: TEXT_DARK });
    
    y -= 20;
    const totalNum = parseFloat(String(data.totalAmount).replace(/,/g, '')) || 0;
    const advNum = parseFloat(String(data.advanceAmount).replace(/,/g, '')) || 0;
    const balDue = `Rs. ${(totalNum - advNum).toLocaleString('en-IN')}`;
    const balDueW = bold.widthOfTextAtSize(balDue, 15);
    
    page1.drawText("BALANCE DUE:", { x: margin, y, size: 11, font: bold, color: TEXT_DARK });
    page1.drawText(balDue, { x: rightEdge - balDueW, y, size: 15, font: bold, color: PRIMARY });

    // --- NOTES ---
    y -= 35;
    if (data.notes) {
      page1.drawText("NOTES", { x: margin, y, size: 9, font: bold, color: PRIMARY });
      y -= 16;
      
      const rawNotes = String(data.notes).split(/[\r\n]+/);
      for (const rawLine of rawNotes) {
        let remaining = cleanText(rawLine);
        const maxChars = 80;
        while (remaining.length > 0) {
          let chunk = remaining.substring(0, maxChars);
          if (remaining.length > maxChars) {
            let breakAt = chunk.lastIndexOf(" ");
            if (breakAt > 20) {
              chunk = remaining.substring(0, breakAt);
              remaining = remaining.substring(breakAt + 1);
            } else {
              remaining = remaining.substring(maxChars);
            }
          } else {
            remaining = "";
          }
          page1.drawText(chunk, { x: margin, y, size: 9, font: regular, color: TEXT_DARK });
          y -= 14;
          if (y < 100) break;
        }
      }
    }

    // --- FOOTER ---
    const footerY = 85;
    drawLine(page1, margin, footerY + 20, rightEdge, footerY + 20, 0.5);

    page1.drawText(cleanText(`Booked by: ${data.createdBy}  |  Created: ${data.createdAt.split('T')[0]}`), {
      x: margin, y: footerY + 6, size: 7.5, font: regular, color: TEXT_MUTED,
    });
    page1.drawText(cleanText(biz.address), {
      x: margin, y: footerY - 8, size: 7.5, font: regular, color: TEXT_MUTED,
    });
    page1.drawText(cleanText(`P: ${biz.phone} | E: ${biz.email}`), {
      x: margin, y: footerY - 20, size: 7.5, font: regular, color: TEXT_MUTED,
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

    return pdfDoc.save();
  } catch (err) {
    console.error("Premium PDF Error, falling back:", err);
    // FALLBACK: Minimalist PDF that is guaranteed to work
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const p = doc.addPage([595, 842]);
    p.drawText("BOOKAL BOOKING RECEIPT", { x: 50, y: 800, size: 20, font });
    p.drawText(`Ref: ${data.bookingRef}`, { x: 50, y: 770, size: 12, font });
    p.drawText(`Customer: ${cleanText(data.customerName)}`, { x: 50, y: 750, size: 12, font });
    p.drawText(`Date: ${data.bookingDate}`, { x: 50, y: 730, size: 12, font });
    p.drawText(`Total: Rs. ${data.totalAmount}`, { x: 50, y: 710, size: 12, font });
    p.drawText("Receipt generated in safe mode due to data processing error.", { x: 50, y: 100, size: 8, font });
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
