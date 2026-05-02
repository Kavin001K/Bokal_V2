import { logger } from "./logger.js";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function uploadToBucket(bucket: string, path: string, buffer: Buffer | Uint8Array, contentType = "application/pdf") {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error(
      "Supabase credentials missing in environment. Set EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  if (buffer instanceof Uint8Array && !Buffer.isBuffer(buffer)) {
    buffer = Buffer.from(buffer);
  }

  const url = `${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": contentType,
      "x-upsert": "true"
    },
    body: buffer
  });

  if (!response.ok) {
    const err = await response.text();
    logger.error({ err, path, bucket }, "Supabase Storage upload failed");
    throw new Error(`Storage upload failed: ${err}`);
  }

  return { path };
}

export async function downloadFromBucket(bucket: string, path: string): Promise<Buffer> {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error(
      "Supabase credentials missing in environment. Set EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  const url = `${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`;
  
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${SUPABASE_KEY}`
    }
  });

  if (!response.ok) {
    throw new Error(`Storage download failed for ${path}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export function getPublicUrl(bucket: string, path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}
