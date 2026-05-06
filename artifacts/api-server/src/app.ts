import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { seedIfEmpty } from "./lib/seed.js";

const app: Express = express();

// Global rate limiter — 200 requests per minute per IP
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too Many Requests", message: "Rate limit exceeded. Try again shortly." },
}));
const isProduction = process.env["NODE_ENV"] === "production";

app.use(
  helmet({
    hsts: isProduction
      ? {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true,
        }
      : false,
  }),
);

const allowedOrigins = (process.env.CORS_ORIGINS ?? "https://bookal-erp-v123.web.app,https://bookal-erp-v123.firebaseapp.com,https://bookal.onrender.com")
  .split(",")
  .map((v) => v.trim())
  .filter(Boolean);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// --- PRODUCTION OPTIMIZATION ---
app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Allow all localhost origins for local development
    if (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")) {
      return callback(null, true);
    }
    return callback(new Error("CORS blocked"));
  },
  credentials: true,
}));

app.use(cookieParser());
app.use(express.json({ limit: "50mb" }));

// Render Health Check
app.get("/health", (req, res) => res.status(200).send("OK"));
app.use(express.urlencoded({ extended: true }));

app.get("/", (_req, res) => {
  res.json({
    status: "online",
    message: "Bookal API is live",
    version: "1.0.0",
    endpoints: {
      health: "/api/healthz",
      auth: "/api/auth",
      bookings: "/api/bookings",
      test: "/api/test/pdf-test"
    },
  });
});

import { db, bookingsTable } from "@workspace/db";
import { and, eq, lt } from "drizzle-orm";

app.use("/api", router);

seedIfEmpty().catch((err) => logger.error({ err }, "Seed failed"));

// Auto-complete past bookings — runs every hour
async function autoCompletePastBookings() {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const cutoffDate = yesterday.toISOString().split("T")[0]!;

    const result = await db
      .update(bookingsTable)
      .set({ status: "completed", updatedAt: new Date() })
      .where(
        and(
          eq(bookingsTable.status, "confirmed"),
          lt(bookingsTable.bookingDate, cutoffDate)
        )
      )
      .returning({ id: bookingsTable.id });

    if (result.length > 0) {
      logger.info({ count: result.length }, "Auto-completed past bookings");
    }
  } catch (err) {
    logger.error({ err }, "Auto-complete cron error");
  }
}

// Run immediately on startup, then every hour
autoCompletePastBookings();
setInterval(autoCompletePastBookings, 60 * 60 * 1000);

// Global Error Handler
app.use((err: any, _req: any, res: any, _next: any) => {
  logger.error({ err }, "Unhandled error");
  res.status(err.status || 500).json({
    error: "Internal Server Error",
    message: process.env.NODE_ENV === "development" ? err.message : "An unexpected error occurred",
  });
});

export default app;
