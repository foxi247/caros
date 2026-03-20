import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./routers";
import { createContext } from "./trpc";

export const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// ─── Static Files (local dev only — Vercel serves from CDN) ──────────────────

if (process.env.NODE_ENV !== "production") {
  app.use(
    "/uploads",
    express.static(path.join(process.cwd(), "public", "uploads"))
  );
}

// ─── Instagram OAuth Callback ─────────────────────────────────────────────────

app.get("/api/instagram/callback", (req, res) => {
  const code = req.query.code as string;
  const error = req.query.error as string;
  const base = process.env.CLIENT_URL || "http://localhost:5173";

  if (error) {
    return res.redirect(
      `${base}/dashboard?instagram_error=${encodeURIComponent(error)}`
    );
  }
  if (!code) {
    return res.redirect(`${base}/dashboard?instagram_error=no_code`);
  }
  return res.redirect(
    `${base}/dashboard?instagram_code=${encodeURIComponent(code)}`
  );
});

// ─── tRPC ─────────────────────────────────────────────────────────────────────

app.use(
  "/api/trpc",
  createExpressMiddleware({ router: appRouter, createContext })
);

// ─── Serve Frontend in Production (non-Vercel) ───────────────────────────────

if (process.env.NODE_ENV === "production" && !process.env.VERCEL) {
  const clientDist = path.join(process.cwd(), "dist", "client");
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}
