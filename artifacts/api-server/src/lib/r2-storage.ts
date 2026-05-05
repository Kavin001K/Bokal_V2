import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { logger } from "./logger.js";

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME;

function getClient(): S3Client {
  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    throw new Error("Missing R2 configuration. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME.");
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

export function getBucketName(): string {
  if (!bucketName) {
    throw new Error("Missing R2_BUCKET_NAME");
  }
  return bucketName;
}

export async function uploadToBucket(_bucket: string, path: string, buffer: Buffer | Uint8Array, contentType = "application/pdf") {
  const client = getClient();
  const body = buffer instanceof Uint8Array && !Buffer.isBuffer(buffer) ? Buffer.from(buffer) : buffer;
  const bucket = getBucketName();

  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: path,
    Body: body,
    ContentType: contentType,
  }));

  logger.info({ bucket, path }, "Uploaded file to R2");
  return { path };
}

export async function downloadFromBucket(_bucket: string, path: string): Promise<Buffer> {
  const client = getClient();
  const bucket = getBucketName();
  const response = await client.send(new GetObjectCommand({
    Bucket: bucket,
    Key: path,
  }));

  if (!response.Body) {
    throw new Error(`No body returned for ${path}`);
  }

  const bytes = await response.Body.transformToByteArray();
  return Buffer.from(bytes);
}

export async function getPublicUrl(_bucket: string, path: string): Promise<string> {
  const client = getClient();
  const bucket = getBucketName();
  return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: path }), { expiresIn: 300 });
}
