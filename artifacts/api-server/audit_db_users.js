import { db, usersTable } from "./src/lib/db.js";
import { isNull, and, eq } from "drizzle-orm";

async function audit() {
  console.log("--- DATABASE AUDIT: USERS ---");
  const allUsers = await db.select().from(usersTable);
  console.table(allUsers.map(u => ({
    id: u.id,
    name: u.fullName,
    active: u.isActive,
    deletedAt: u.deletedAt,
    adminId: u.adminId
  })));
  process.exit(0);
}

audit().catch(console.error);
