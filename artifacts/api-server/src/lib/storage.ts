import { logger } from "./logger";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY; // Using anon key for now, bucket must be public

export async function uploadBookingPdf(fileName: string, pdfBuffer: Uint8Array): Promise<string | null> {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    logger.error("Supabase environment variables missing");
    return null;
  }

  try {
    const bucket = "bookings";
    const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${bucket}/${fileName}`;

    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/pdf",
        "x-upsert": "true"
      },
      body: pdfBuffer
    });

    if (!response.ok) {
      const err = await response.text();
      logger.error({ err }, "Failed to upload PDF to Supabase Storage");
      return null;
    }

    // Return the public URL
    return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${fileName}`;
  } catch (error) {
    logger.error({ error }, "Error in uploadBookingPdf");
    return null;
  }
}
