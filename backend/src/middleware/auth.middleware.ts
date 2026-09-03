import type { Request, Response, NextFunction } from "express";

export interface AuthenticatedRequest extends Request {
  userSid?: string;
}

/**
 * Extracts Frappe 'sid' from incoming request headers or cookies.
 */
export function extractUserSid(req: Request): string | undefined {
  const sidHeader = req.headers["x-user-sid"] as string | undefined;
  if (sidHeader && sidHeader.trim()) return sidHeader.trim();

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    if (token) return token;
  }

  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const match = cookieHeader.match(/sid=([^;]+)/);
    if (match && match[1]) return match[1].trim();
  }

  return undefined;
}

/**
 * Middleware that strictly enforces authenticated user session.
 * Rejects requests that have no user session, preventing unauthenticated access.
 */
export function requireUserAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const sid = extractUserSid(req);
  if (!sid) {
    res.status(401).json({
      success: false,
      error: "آپ کا سیشن ختم ہو چکا ہے یا آپ لاگ اِن نہیں ہیں۔ براہ کرم لاگ اِن کریں۔ (Authentication required)",
    });
    return;
  }
  req.userSid = sid;
  next();
}
