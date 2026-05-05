import { Router } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import crypto from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { refreshTokensTable } from "@workspace/db/schema";
import { signToken } from "../lib/auth.js";
import { firstString } from "../lib/express-utils.js";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";

const router = Router();
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too Many Requests",
    message: "Too many login attempts. Please try again in 15 minutes.",
  },
});

const REFRESH_TOKEN_TTL_DAYS = 30;

function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString("base64url");
}

router.post("/auth/login", loginLimiter, async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: "Bad Request", message: "Email and password required" });
    return;
  }

  try {
    const user = await db
      .select()
      .from(usersTable)
      .where(and(
        eq(usersTable.email, email.toLowerCase().trim()),
        isNull(usersTable.deletedAt)
      ))
      .limit(1);

    if (!user[0]) {
      res.status(401).json({ error: "Unauthorized", message: "Invalid email or password" });
      return;
    }

    if (!user[0].isActive) {
      res.status(401).json({ error: "Unauthorized", message: "Your account is disabled" });
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
      adminId: user[0].role === "admin" ? user[0].id : (user[0].adminId ?? user[0].id),
      mustChangePw: user[0].mustChangePw,
    });
    const refreshToken = generateRefreshToken();
    const deviceName = firstString(req.headers["x-device-name"]) ?? firstString(req.headers["user-agent"]) ?? null;
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

    await db.insert(refreshTokensTable).values({
      userId: user[0].id,
      token: refreshToken,
      deviceName,
      expiresAt,
    });

    res.json({
      token,
      refreshToken,
      user: {
        id: user[0].id,
        fullName: user[0].fullName,
        email: user[0].email,
        role: user[0].role,
        mustChangePw: user[0].mustChangePw,
      },
    });
  } catch (err: any) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ 
      error: "Internal Server Error", 
      message: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined
    });
  }
});

router.post("/auth/refresh", async (req, res) => {
  const { refreshToken } = req.body as { refreshToken?: string };
  if (!refreshToken) {
    res.status(400).json({ error: "Bad Request", message: "Refresh token is required" });
    return;
  }

  const now = new Date();
  const tokenRows = await db
    .select()
    .from(refreshTokensTable)
    .where(and(eq(refreshTokensTable.token, refreshToken), gt(refreshTokensTable.expiresAt, now)))
    .limit(1);

  if (!tokenRows[0]) {
    res.status(401).json({ error: "Unauthorized", message: "Invalid or expired refresh token" });
    return;
  }

  const userRows = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, tokenRows[0].userId))
    .limit(1);

  if (!userRows[0] || !userRows[0].isActive) {
    await db.delete(refreshTokensTable).where(eq(refreshTokensTable.id, tokenRows[0].id));
    res.status(401).json({ error: "Unauthorized", message: "User not active" });
    return;
  }

  const user = userRows[0];
  const newAccessToken = signToken({
    userId: user.id,
    email: user.email,
    name: user.fullName,
    role: user.role,
    adminId: user.role === "admin" ? user.id : (user.adminId ?? user.id),
    mustChangePw: user.mustChangePw,
  });
  const newRefreshToken = generateRefreshToken();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  await db.transaction(async (tx) => {
    await tx.delete(refreshTokensTable).where(eq(refreshTokensTable.id, tokenRows[0]!.id));
    await tx.insert(refreshTokensTable).values({
      userId: user.id,
      token: newRefreshToken,
      deviceName: tokenRows[0]!.deviceName,
      expiresAt,
      lastUsedAt: now,
    });
  });

  res.json({
    token: newAccessToken,
    refreshToken: newRefreshToken,
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      mustChangePw: user.mustChangePw,
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
