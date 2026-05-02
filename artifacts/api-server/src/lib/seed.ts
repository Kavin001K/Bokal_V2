import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable, venuesTable, settingsTable } from "@workspace/db/schema";
import { logger } from "./logger.js";

export async function seedIfEmpty() {
  try {
    const existingUsers = await db.select().from(usersTable);
    logger.info({ usersCount: existingUsers.length, users: existingUsers.map(u => u.email) }, "Current users in DB");
    
    if (existingUsers.length > 0) return;

    logger.info("Seeding initial data...");

    const passwordHash = await bcrypt.hash("Bookal2026", 12);
    await db.insert(usersTable).values({
      fullName: "Admin",
      email: "admin@bookal.app",
      passwordHash,
      role: "admin",
      isActive: true,
      mustChangePw: false,
    });

    const existingVenues = await db.select().from(venuesTable).limit(1);
    if (existingVenues.length === 0) {
      await db.insert(venuesTable).values([
        { name: "Mahal", type: "mahal", pricePerHour: "2000", isActive: true, displayOrder: 1 },
        { name: "AC Room 1", type: "room", pricePerHour: "500", isActive: true, displayOrder: 2 },
        { name: "AC Room 2", type: "room", pricePerHour: "500", isActive: true, displayOrder: 3 },
        { name: "AC Room 3", type: "room", pricePerHour: "500", isActive: true, displayOrder: 4 },
      ]);
    }

    const existingSettings = await db.select().from(settingsTable).limit(1);
    if (existingSettings.length === 0) {
      await db.insert(settingsTable).values([
        { key: "rules_pdf_path", value: "" },
        { key: "default_duration_hours", value: "4" },
        { key: "session_timeout_hours", value: "24" },
      ]);
    }

    logger.info("Seed complete. Admin login: admin@bookal.app / Bookal2026");
  } catch (err) {
    logger.error({ err }, "Seed error");
  }
}
