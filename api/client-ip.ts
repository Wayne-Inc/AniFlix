// Client IP detection — Vercel Node function.
import type { IncomingMessage, ServerResponse } from "node:http";

function clientIp(req: IncomingMessage): string {
  const headers = req.headers;
  const cf = headers["cf-connecting-ip"];
  if (cf) return Array.isArray(cf) ? cf[0].trim() : cf.trim();
  const vercel = headers["x-vercel-forwarded-for"];
  if (vercel) return (Array.isArray(vercel) ? vercel[0] : vercel).split(",")[0].trim();
  const forwarded = headers["x-forwarded-for"];
  if (forwarded) return (Array.isArray(forwarded) ? forwarded[0] : forwarded).split(",")[0].trim();
  const realIp = headers["x-real-ip"];
  if (realIp) return Array.isArray(realIp) ? realIp[0].trim() : realIp.trim();
  return "";
}

function json(res: ServerResponse, status: number, payload: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "GET") {
    json(res, 405, { error: "method_not_allowed" });
    return;
  }
  
  json(res, 200, { ip: clientIp(req) });
}