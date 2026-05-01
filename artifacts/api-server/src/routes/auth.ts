import { Router } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { signToken } from "../lib/auth.js";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: "Bad Request", message: "Email and password required" });
    return;
  }

  const user = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase().trim()))
    .limit(1);

  if (!user[0] || !user[0].isActive) {
    res.status(401).json({ error: "Unauthorized", message: "Invalid email or password" });
    return;
  }

  const valid = await bcrypt.compare(password, user[0].passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Unauthorized", message: "Invalid email or password" });
    return;
  }

  await db
    .update(usersTable)
    .set({ lastLogin: new Date() })
    .where(eq(usersTable.id, user[0].id));

  const token = signToken({
    userId: user[0].id,
    email: user[0].email,
    name: user[0].fullName,
    role: user[0].role,
    mustChangePw: user[0].mustChangePw,
  });

  res.json({
    token,
    user: {
      id: user[0].id,
      fullName: user[0].fullName,
      email: user[0].email,
      role: user[0].role,
      mustChangePw: user[0].mustChangePw,
    },
  });
});

router.post("/auth/change-password", requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body as {
    currentPassword?: string;
    newPassword?: string;
  };

  if (!newPassword || newPassword.length < 6) {
    res.status(400).json({ error: "Bad Request", message: "New password must be at least 6 characters" });
    return;
  }

  const user = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.user!.userId))
    .limit(1);

  if (!user[0]) {
    res.status(404).json({ error: "Not Found" });
    return;
  }

  if (!user[0].mustChangePw && currentPassword) {
    const valid = await bcrypt.compare(currentPassword, user[0].passwordHash);
    if (!valid) {
      res.status(400).json({ error: "Bad Request", message: "Current password incorrect" });
      return;
    }
  }

  const hash = await bcrypt.hash(newPassword, 12);
  await db
    .update(usersTable)
    .set({ passwordHash: hash, mustChangePw: false })
    .where(eq(usersTable.id, user[0].id));

  res.json({ success: true, message: "Password changed successfully" });
});

export default router;
