import { Request, Response, NextFunction } from "express";
import { auth } from "@/lib/auth";
import { users } from "@/schema/schema";
import { database } from "@/configs/connection.config";
import { eq } from "drizzle-orm";

type User = typeof users.$inferSelect;

declare global {
  namespace Express {
    interface Request {
      user?: User;
      apiClient?: { id: string; role: string };
    }
  }
}

const findUserByApiKey = async (apiKey: string): Promise<User | null> => {
  const user = await database
    .select()
    .from(users)
    .where(eq(users.shopify_api_key, apiKey));
  return user[0] || null;
};

const findUserByAccessToken = async (
  accessToken: string
): Promise<User | null> => {
  const userRecord = await database
    .select()
    .from(users)
    .where(eq(users.shopify_access_token, accessToken));

  return userRecord[0] || null;
};

export const protectRoute = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authorizationHeader = req.headers["authorization"];
    const apiKeyHeader = req.headers["x-api-key"];

    if (authorizationHeader && authorizationHeader.startsWith("Bearer ")) {
      const accessToken = authorizationHeader.substring(7);
      const user = await findUserByAccessToken(accessToken);

      if (user) {
        req.user = user;
        return next();
      }
    }

    if (typeof apiKeyHeader === "string" && apiKeyHeader.length > 0) {
      const user = await findUserByApiKey(apiKeyHeader);

      if (user) {
        req.user = user;
        return next();
      }
    }

    const headers = new Headers();
    if (req.headers.cookie) {
      headers.set("cookie", req.headers.cookie);
    }
    if (req.headers["user-agent"]) {
      headers.set("user-agent", req.headers["user-agent"]);
    }

    const session = await auth.api.getSession({ headers });

    if (session && session.user) {
      req.user = session.user as unknown as User;
      return next();
    }

    res.status(401).json({
      error: "UNAUTHORIZED",
      message:
        "You must be logged in or provide valid API credentials to access this resource.",
    });
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(500).json({
      error: "AUTHENTICATION_ERROR",
      message: "An internal error occurred during authentication.",
    });
  }
};

export const getCurrentUserId = (req: Request): string | null => {
  return req.user?.id || null;
};

export const ensureAuthenticated = async (req: Request): Promise<boolean> => {
  try {
    const headers = new Headers(req.headers as HeadersInit);
    const session = await auth.api.getSession({ headers });
    return !!(session && session.user);
  } catch (error) {
    return false;
  }
};
