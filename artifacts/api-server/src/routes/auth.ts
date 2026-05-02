import { Router } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { signToken } from "../lib/auth.js";
import { firstString } from "../lib/express-utils.js";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";

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

  // Always require current password UNLESS this is a forced first-login change
  if (user[0].mustChangePw) {
    // First-login forced change — skip current password check
  } else {
    if (!currentPassword) {
      res.status(400).json({ error: "Bad Request", message: "Current password is required" });
      return;
    }
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

router.post("/auth/reset-password/:userId", requireAdmin, async (req, res) => {
  const userId = firstString(req.params.userId);
  const { newPassword } = req.body as { newPassword?: string };

  if (!userId) {
    res.status(400).json({ error: "Bad Request", message: "User ID is required" });
    return;
  }

  if (!newPassword || newPassword.length < 6) {
    res.status(400).json({ error: "Bad Request", message: "New password must be at least 6 characters" });
    return;
  }

  const user = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId!))
    .limit(1);

  if (!user[0]) {
    res.status(404).json({ error: "Not Found", message: "User not found" });
    return;
  }

  const hash = await bcrypt.hash(newPassword, 12);
  await db
    .update(usersTable)
    .set({ passwordHash: hash, mustChangePw: true })
    .where(eq(usersTable.id, userId!));

  res.json({ success: true, message: "Password reset successfully. User must change on next login." });
});
router.get("/auth/profile", requireAuth, async (req, res) => {
  const user = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.user!.userId))
    .limit(1);

  if (!user[0]) {
    res.status(404).json({ error: "Not Found", message: "User not found" });
    return;
  }

  res.json({
    id: user[0].id,
    fullName: user[0].fullName,
    email: user[0].email,
    phoneNumber: user[0].phoneNumber,
    dateOfBirth: user[0].dateOfBirth,
    role: user[0].role,
  });
});

router.put("/auth/profile", requireAuth, async (req, res) => {
  const { fullName, phoneNumber, dateOfBirth } = req.body as {
    fullName?: string;
    phoneNumber?: string;
    dateOfBirth?: string;
  };

  const updateData: any = {};
  if (fullName !== undefined) updateData.fullName = fullName;
  if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
  if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth;

  if (Object.keys(updateData).length === 0) {
    res.status(400).json({ error: "Bad Request", message: "No data to update" });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set(updateData)
    .where(eq(usersTable.id, req.user!.userId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Not Found", message: "User not found" });
    return;
  }

  res.json({
    success: true,
    user: {
      id: updated.id,
      fullName: updated.fullName,
      email: updated.email,
      phoneNumber: updated.phoneNumber,
      dateOfBirth: updated.dateOfBirth,
      role: updated.role,
    },
  });
});

export default router;
