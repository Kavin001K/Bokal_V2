import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { usersTable, venuesTable, settingsTable } from "@workspace/db/schema";
import { logger } from "./logger.js";

const DEFAULT_ADMIN_EMAIL = "admin@bookal.app";
const DEFAULT_ADMIN_PASSWORD = process.env["DEFAULT_ADMIN_PASSWORD"] || "Bookal@2026";

export async function seedIfEmpty() {
  try {
    const adminUser = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, DEFAULT_ADMIN_EMAIL))
      .limit(1);

    if (adminUser.length === 0) {
      logger.info("No admin user found, seeding...");
      const passwordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 12);
      await db.insert(usersTable).values({
        fullName: "Admin",
        email: DEFAULT_ADMIN_EMAIL,
        passwordHash,
        role: "admin",
        isActive: true,
        mustChangePw: false,
      });
      logger.info("Admin user created");
    } else {
      if (!adminUser[0]!.isActive) {
        logger.warn("Admin user exists but is inactive, activating...");
        await db
          .update(usersTable)
          .set({ isActive: true })
          .where(eq(usersTable.email, DEFAULT_ADMIN_EMAIL));
      }

      if (process.env["FORCE_ADMIN_PASSWORD_RESET"]?.toLowerCase() === "true") {
        console.log("!!! FORCING ADMIN PASSWORD RESET TO:", DEFAULT_ADMIN_PASSWORD);
        const passwordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 12);
        await db
          .update(usersTable)
          .set({ passwordHash, mustChangePw: false, isActive: true })
          .where(eq(usersTable.email, DEFAULT_ADMIN_EMAIL));
        console.log("!!! ADMIN PASSWORD RESET SUCCESSFUL");
      }

      logger.info({ email: DEFAULT_ADMIN_EMAIL }, "Admin user already exists");
    }

    const existingVenues = await db.select().from(venuesTable).limit(1);
    if (existingVenues.length === 0) {
      await db.insert(venuesTable).values([
        { name: "Mahal", type: "mahal", pricePerHour: "2000", isActive: true, displayOrder: 1 },
        { name: "AC Room 1", type: "room", pricePerHour: "500", isActive: true, displayOrder: 2 },
        { name: "AC Room 2", type: "room", pricePerHour: "500", isActive: true, displayOrder: 3 },
        { name: "AC Room 3", type: "room", pricePerHour: "500", isActive: true, displayOrder: 4 },
      ]);
      logger.info("Venues seeded");
    }

    const settingsToSeed = [
      { key: "rules_pdf_path", value: "" },
      { key: "default_duration_hours", value: "4" },
      { key: "session_timeout_hours", value: "24" },
      { key: "biz_name", value: "Bookal Venue" },
      { key: "biz_tagline", value: "Venue Booking Made Simple" },
      { key: "biz_address", value: "Tamil Nadu, India" },
      { key: "biz_phone", value: "+91 98765 43210" },
      { key: "biz_email", value: "contact@bookal.app" },
      { key: "biz_gst", value: "" },
    ];

    for (const setting of settingsToSeed) {
      const existing = await db
        .select()
        .from(settingsTable)
        .where(eq(settingsTable.key, setting.key))
        .limit(1);
      if (existing.length === 0) {
        await db.insert(settingsTable).values(setting);
      }
    }

    logger.info(`Seed complete. Login: ${DEFAULT_ADMIN_EMAIL} / ${DEFAULT_ADMIN_PASSWORD}`);
  } catch (err) {
    logger.error({ err }, "Seed error");
  }
}
