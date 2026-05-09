import { Request, Response, NextFunction, RequestHandler } from "express";
import { createHmac, timingSafeEqual } from "crypto";
import { env } from "@/utils/env.util";

/**
 * HMAC Webhook Verification Middleware
 *
 * Must be paired with express.raw({ type: 'application/json' }) on the same route
 * so the raw body buffer is available before express.json() parses it.
 *
 * Usage in router:
 *   router.post("/some/route", express.raw({ type: "application/json" }), verifyWebhookHmac, handler);
 */
export const verifyWebhookHmac: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const hmacHeader = req.headers["x-shopify-hmac-sha256"] as string | undefined;

  if (!hmacHeader) {
    res.status(401).json({ error: "Webhook HMAC verification failed" });
    return;
  }

  // req.body is a Buffer when express.raw() is used upstream
  const rawBody: Buffer = Buffer.isBuffer(req.body)
    ? req.body
    : Buffer.from(JSON.stringify(req.body));

  const digest = createHmac("sha256", env.SHOPIFY_API_SECRET)
    .update(rawBody)
    .digest("base64");

  let headerBuf: Buffer;
  let digestBuf: Buffer;
  try {
    headerBuf = Buffer.from(hmacHeader, "base64");
    digestBuf = Buffer.from(digest, "base64");
  } catch {
    res.status(401).json({ error: "Webhook HMAC verification failed" });
    return;
  }

  // Lengths must match before timingSafeEqual
  if (headerBuf.length !== digestBuf.length || !timingSafeEqual(headerBuf, digestBuf)) {
    res.status(401).json({ error: "Webhook HMAC verification failed" });
    return;
  }

  // Attach parsed JSON body for downstream handlers
  try {
    req.body = JSON.parse(rawBody.toString("utf8"));
  } catch {
    req.body = {};
  }

  next();
};
