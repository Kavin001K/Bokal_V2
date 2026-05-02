import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { seedIfEmpty } from "./lib/seed.js";

const app: Express = express();

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
  origin: "*", // Allow all origins for mobile app compatibility
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
