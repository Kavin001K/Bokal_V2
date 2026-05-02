import { Router } from "express";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { firstString } from "../lib/express-utils.js";
import { requireAdmin } from "../middlewares/auth.js";

const router = Router();

router.get("/users", requireAdmin, async (req, res) => {
  const users = await db.select().from(usersTable).orderBy(usersTable.createdAt);
  res.json(
    users.map((u) => ({
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      mustChangePw: u.mustChangePw,
      createdAt: u.createdAt.toISOString(),
      lastLogin: u.lastLogin?.toISOString() ?? null,
    }))
  );
});

router.post("/users", requireAdmin, async (req, res) => {
  const { fullName, email, password, role } = req.body as {
    fullName: string;
    email: string;
    password: string;
    role: string;
  };

  if (!fullName || !email || !password) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase().trim()))
    .limit(1);

  if (existing[0]) {
    res.status(409).json({ error: "Email already exists" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const [user] = await db
    .insert(usersTable)
    .values({
      fullName,
      email: email.toLowerCase().trim(),
      passwordHash,
      role: role === "admin" ? "admin" : "employee",
      isActive: true,
      mustChangePw: true,
    })
    .returning();

  res.status(201).json({
    id: user!.id,
    fullName: user!.fullName,
    email: user!.email,
    role: user!.role,
    isActive: user!.isActive,
    mustChangePw: user!.mustChangePw,
    createdAt: user!.createdAt.toISOString(),
    lastLogin: null,
  });
});

router.put("/users/:id", requireAdmin, async (req, res) => {
  const id = firstString(req.params.id);
  const { fullName, role, isActive } = req.body as {
    fullName?: string;
    role?: string;
    isActive?: boolean;
  };

  if (!id) {
    res.status(400).json({ error: "Bad Request", message: "User ID is required" });
    return;
  }

  const updates: Partial<typeof usersTable.$inferInsert> = {};
  if (fullName !== undefined) updates.fullName = fullName;
  if (role !== undefined) updates.role = role;
  if (isActive !== undefined) updates.isActive = isActive;

  await db.update(usersTable).set(updates).where(eq(usersTable.id, id!));

  const user = await db.select().from(usersTable).where(eq(usersTable.id, id!)).limit(1);
  if (!user[0]) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  res.json({
    id: user[0].id,
    fullName: user[0].fullName,
    email: user[0].email,
    role: user[0].role,
    isActive: user[0].isActive,
    mustChangePw: user[0].mustChangePw,
    createdAt: user[0].createdAt.toISOString(),
    lastLogin: user[0].lastLogin?.toISOString() ?? null,
  });
});

export default router;
