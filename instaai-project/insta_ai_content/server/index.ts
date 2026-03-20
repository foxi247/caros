import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./routers";
import { createContext } from "./trpc";
import { ensureUploadsDir } from "./_core/imageGen";

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// ─── Static Files ─────────────────────────────────────────────────────────────

// Serve generated carousel images
app.use(
  "/uploads",
  express.static(path.join(process.cwd(), "public", "uploads"))
);

// ─── Instagram OAuth Callback (redirect from Instagram) ───────────────────────

app.get("/api/instagram/callback", (req, res) => {
  const code = req.query.code as string;
  const error = req.query.error as string;

  if (error) {
    return res.redirect(
      `${process.env.CLIENT_URL || "http://localhost:5173"}/dashboard?instagram_error=${encodeURIComponent(error)}`
    );
  }

  if (!code) {
    return res.redirect(
      `${process.env.CLIENT_URL || "http://localhost:5173"}/dashboard?instagram_error=no_code`
    );
  }

  // Pass code to frontend, which will call trpc.instagram.connect
  return res.redirect(
    `${process.env.CLIENT_URL || "http://localhost:5173"}/dashboard?instagram_code=${encodeURIComponent(code)}`
  );
});

// ─── tRPC ─────────────────────────────────────────────────────────────────────

app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// ─── Serve Frontend in Production ─────────────────────────────────────────────

if (process.env.NODE_ENV === "production") {
  const clientDist = path.join(process.cwd(), "dist", "client");
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

// ─── Start ────────────────────────────────────────────────────────────────────

async function start() {
  await ensureUploadsDir();
  app.listen(PORT, () => {
    console.log(`\n✅ Server running at http://localhost:${PORT}`);
    console.log(`   tRPC API: http://localhost:${PORT}/api/trpc`);
  });
}

start().catch(console.error);
