/**
 * Professional Hand-Rolled 2-Page PDF Generator for Bookal.
 * Generates a branded, high-fidelity receipt (Page 1) and rules/conditions (Page 2).
 */

export interface BusinessInfo {
  name: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  gst: string;
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
  notes: string;
  createdBy: string;
  createdAt: string;
  business?: BusinessInfo;
}

export function generatePremiumBookingPdf(data: BookingPdfData): Uint8Array {
  const esc = (str: string) => (str || "").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  
  const biz = data.business || {
    name: "MAHALBOOK VENUES",
    tagline: "Excellence in Event Hosting",
    address: "123 Main Street, Tamil Nadu",
    phone: "+91 98765 43210",
    email: "contact@mahalbook.app",
    gst: "33AAAAA0000A1Z5"
  };

  // --- PAGE 1 CONTENT (Premium Receipt) ---
  const p1Lines = [
    // Header Section
    `BT /F2 26 Tf 50 750 Td (${esc(biz.name.toUpperCase())}) Tj ET`,
    `BT /F1 10 Tf 50 735 Td (${esc(biz.tagline)}) Tj ET`,
    `BT /F1 9 Tf 50 722 Td (GST: ${esc(biz.gst)}) Tj ET`,
    
    // Horizontal Line (Vector-style)
    `0.5 w 50 710 m 560 710 l S`,

    // Ref Number & Title
    `BT /F2 18 Tf 50 680 Td (BOOKING RECEIPT) Tj ET`,
    `BT /F2 14 Tf 400 680 Td (Ref: ${esc(data.bookingRef)}) Tj ET`,

    // Customer Block
    `BT /F2 11 Tf 50 640 Td (CLIENT INFORMATION) Tj ET`,
    `BT /F1 11 Tf 50 625 Td (Name: ${esc(data.customerName)}) Tj ET`,
    `BT /F1 11 Tf 50 610 Td (Phone: ${esc(data.phones)}) Tj ET`,
    `BT /F1 11 Tf 50 595 Td (Address: ${esc(data.address)}) Tj ET`,

    // Schedule Block
    `BT /F2 11 Tf 350 640 Td (EVENT SCHEDULE) Tj ET`,
    `BT /F1 11 Tf 350 625 Td (Date: ${esc(data.bookingDate)}) Tj ET`,
    `BT /F1 10 Tf 350 610 Td (${esc(data.tamilDate)}) Tj ET`,
    `BT /F1 11 Tf 350 595 Td (Time: ${esc(data.startTime)} - ${esc(data.endTime)}) Tj ET`,

    // Line separator
    `0.2 w 50 575 m 560 575 l S`,

    // Venue & Pricing Header
    `BT /F2 11 Tf 50 555 Td (DESCRIPTION) Tj 450 555 Td (SUBTOTAL) Tj ET`,
  ];

  // Venues Table Rows
  data.venues.forEach((v, i) => {
    const y = 535 - i * 20;
    p1Lines.push(`BT /F1 11 Tf 50 ${y} Td (${esc(v.name)}) Tj 450 ${y} Td (Rs. ${esc(v.price)}) Tj ET`);
  });

  const footerTop = 400;
  p1Lines.push(
    `0.5 w 50 ${footerTop + 20} m 560 ${footerTop + 20} l S`,
    `BT /F2 16 Tf 50 ${footerTop} Td (GRAND TOTAL) Tj 430 ${footerTop} Td (Rs. ${esc(data.totalAmount)}) Tj ET`,
    
    // Notes
    `BT /F1 10 Tf 50 ${footerTop - 40} Td (Notes: ${esc(data.notes || "No special requirements recorded.")}) Tj ET`,

    // Business Footer
    `0.2 w 50 80 m 560 80 l S`,
    `BT /F1 8 Tf 50 65 Td (${esc(biz.address)}) Tj ET`,
    `BT /F1 8 Tf 50 55 Td (P: ${esc(biz.phone)} | E: ${esc(biz.email)}) Tj 400 55 Td (Software by MahalBook v1.0) Tj ET`,
  );

  const p1Text = p1Lines.join("\n");

  // --- PAGE 2 CONTENT (Standard Mahal Rules) ---
  const p2Lines = [
    `BT /F2 18 Tf 50 750 Td (TERMS & CONDITIONS) Tj ET`,
    `0.5 w 50 740 m 560 740 l S`,
    `BT /F1 11 Tf 50 710 Td (1. BOOKING ADVANCE: 50% of the total amount must be paid to confirm the slot.) Tj ET`,
    `BT /F1 11 Tf 50 690 Td (2. FINAL PAYMENT: Remaining balance due exactly 7 days prior to the event date.) Tj ET`,
    `BT /F1 11 Tf 50 670 Td (3. CANCELLATION: No refund if cancelled within 15 days of event. 50% if 30 days.) Tj ET`,
    `BT /F1 11 Tf 50 650 Td (4. ELECTRICITY: AC usage charges are calculated as per actual meter readings separately.) Tj ET`,
    `BT /F1 11 Tf 50 630 Td (5. CLEANING: A mandatory cleaning fee of Rs. 1,000 is included in every booking.) Tj ET`,
    `BT /F1 11 Tf 50 610 Td (6. DECORATIONS: Strictly no nails, tape, or permanent markings on walls or ceilings.) Tj ET`,
    `BT /F1 11 Tf 50 590 Td (7. MUSIC/SOUND: Volume must adhere to legal limits; no loud music after 10:00 PM.) Tj ET`,
    `BT /F1 11 Tf 50 570 Td (8. DAMAGES: Any property damage will be billed directly to the primary customer.) Tj ET`,
    `BT /F1 11 Tf 50 550 Td (9. VALUABLES: Management is not responsible for loss of personal cash or jewelry.) Tj ET`,
    `BT /F1 11 Tf 50 530 Td (10. LIQUOR: Consumption of alcohol is strictly prohibited within the Mahal premises.) Tj ET`,
    
    `BT /F2 11 Tf 50 480 Td (ACKNOWLEDGEMENT) Tj ET`,
    `BT /F1 10 Tf 50 460 Td (I have read and agree to follow all the rules and conditions mentioned above.) Tj ET`,
    `BT /F1 11 Tf 50 400 Td (Customer Signature: ________________________) Tj 350 400 Td (Date: ____________) Tj ET`,

    // Page 2 Footer
    `0.2 w 50 80 m 560 80 l S`,
    `BT /F1 8 Tf 50 65 Td (${esc(biz.name)}) Tj 500 65 Td (Page 2/2) Tj ET`,
  ];
  const p2Text = p2Lines.join("\n");

  // PDF Streams
  const p1Stream = `stream\n${p1Text}\nendstream`;
  const p2Stream = `stream\n${p2Text}\nendstream`;

  let pdf = `%PDF-1.4\n`;
  const obj1 = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`;
  const obj2 = `2 0 obj\n<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>\nendobj\n`;
  const obj3 = `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 5 0 R /Resources << /Font << /F1 7 0 R /F2 8 0 R >> >> >>\nendobj\n`;
  const obj4 = `4 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 6 0 R /Resources << /Font << /F1 7 0 R /F2 8 0 R >> >> >>\nendobj\n`;
  const obj5 = `5 0 obj\n<< /Length ${p1Stream.length - 16} >>\n${p1Stream}\nendobj\n`;
  const obj6 = `6 0 obj\n<< /Length ${p2Stream.length - 16} >>\n${p2Stream}\nendobj\n`;
  const obj7 = `7 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`;
  const obj8 = `8 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n`;

  const offsets = [];
  offsets.push(pdf.length); pdf += obj1;
  offsets.push(pdf.length); pdf += obj2;
  offsets.push(pdf.length); pdf += obj3;
  offsets.push(pdf.length); pdf += obj4;
  offsets.push(pdf.length); pdf += obj5;
  offsets.push(pdf.length); pdf += obj6;
  offsets.push(pdf.length); pdf += obj7;
  offsets.push(pdf.length); pdf += obj8;

  const xrefPos = pdf.length;
  pdf += `xref\n0 9\n0000000000 65535 f \n`;
  offsets.forEach(off => {
    pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size 9 /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;

  return new TextEncoder().encode(pdf);
}
