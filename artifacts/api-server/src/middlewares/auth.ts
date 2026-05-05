import { Request, Response, NextFunction } from "express";
import { verifyToken, type JwtPayload } from "../lib/auth.js";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  let token = "";
  const authHeader = req.headers.authorization;
  
  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.slice(7);
  } else if (req.query.token) {
    token = req.query.token as string;
  }

  if (!token) {
    res.status(401).json({ error: "Unauthorized", message: "No token provided" });
    return;
  }
  try {
    const decoded = verifyToken(token);
    
    // X-RAY LOG: Verify what's inside the token
    console.log(`!!! AUTH GATE - User: ${decoded.email}, AdminId: ${decoded.adminId}, Role: ${decoded.role}`);
    
    // FAIL HARD if adminId is missing in the token (Multi-tenant requirement)
    if (!decoded.adminId) {
       console.error(`!!! SECURITY ALERT: User ${decoded.email} logged in without AdminId context. Forcing Logout.`);
       res.status(401).json({ error: "Unauthorized", message: "Session invalid (missing Mahal context). Please log out and back in." });
       return;
    }

    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Unauthorized", message: "Invalid or expired token" });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (req.user?.role !== "admin") {
      res.status(403).json({ error: "Forbidden", message: "Admin access required" });
      return;
    }
    next();
  });
}
