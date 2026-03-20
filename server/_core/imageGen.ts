import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import { uploadImageToSupabase } from "./supabase";

// ─── Local dev setup ──────────────────────────────────────────────────────────

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads", "carousels");

export async function ensureUploadsDir() {
  if (!process.env.SUPABASE_URL) {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseColorScheme(colorScheme: string) {
  const d = { primary: "#6366f1", secondary: "#818cf8", text: "#ffffff" };
  if (!colorScheme) return d;
  return {
    primary: colorScheme.match(/primary:\s*(#[0-9a-fA-F]{3,6})/)?.[1] || d.primary,
    secondary: colorScheme.match(/secondary:\s*(#[0-9a-fA-F]{3,6})/)?.[1] || d.secondary,
    text: colorScheme.match(/text:\s*(#[0-9a-fA-F]{3,6})/)?.[1] || d.text,
  };
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length <= maxChars) {
      current = (current + " " + word).trim();
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function escapeXml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function buildSvg(
  heading: string, content: string, colorScheme: string,
  slideNumber: number, slideCount: number
): string {
  const c = parseColorScheme(colorScheme);
  const W = 1080, H = 1080;
  const headingLines = wrapText(heading || "", 22);
  const contentLines = wrapText(content || "", 38);
  const headingY = 360, lh = 64;
  const contentY = headingY + headingLines.length * lh + 48;

  const headingSvg = headingLines.map((line, i) =>
    `<text x="540" y="${headingY + i * lh}" text-anchor="middle"
      font-family="'Arial Black',Arial,sans-serif" font-size="52" font-weight="900"
      fill="${escapeXml(c.text)}" filter="url(#sh)">${escapeXml(line)}</text>`
  ).join("\n");

  const contentSvg = contentLines.slice(0, 6).map((line, i) =>
    `<text x="540" y="${contentY + i * 44}" text-anchor="middle"
      font-family="Arial,sans-serif" font-size="32"
      fill="${escapeXml(c.text)}" opacity="0.92">${escapeXml(line)}</text>`
  ).join("\n");

  const dots = Array.from({ length: slideCount }, (_, i) =>
    i === slideNumber - 1
      ? `<circle cx="${540 - (slideCount * 20) / 2 + i * 20 + 10}" cy="1030" r="6" fill="${escapeXml(c.text)}" opacity="1"/>`
      : `<circle cx="${540 - (slideCount * 20) / 2 + i * 20 + 10}" cy="1030" r="4" fill="${escapeXml(c.text)}" opacity="0.4"/>`
  ).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${escapeXml(c.primary)};stop-opacity:1"/>
      <stop offset="100%" style="stop-color:${escapeXml(c.secondary)};stop-opacity:1"/>
    </linearGradient>
    <filter id="sh" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="rgba(0,0,0,0.3)"/>
    </filter>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <circle cx="100" cy="100" r="180" fill="${escapeXml(c.text)}" opacity="0.06"/>
  <circle cx="980" cy="980" r="220" fill="${escapeXml(c.text)}" opacity="0.06"/>
  <rect x="48" y="48" width="72" height="36" rx="18" fill="${escapeXml(c.text)}" opacity="0.18"/>
  <text x="84" y="71" text-anchor="middle" font-family="Arial,sans-serif"
    font-size="18" font-weight="700" fill="${escapeXml(c.text)}">${slideNumber}/${slideCount}</text>
  ${headingSvg}
  <rect x="440" y="${contentY - 24}" width="200" height="3" rx="2" fill="${escapeXml(c.text)}" opacity="0.4"/>
  ${contentSvg}
  ${dots}
</svg>`;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function generateSlideImage(
  postId: number, slideNumber: number,
  heading: string, content: string,
  colorScheme: string, slideCount: number
): Promise<string> {
  const svg = buildSvg(heading, content, colorScheme, slideNumber, slideCount);
  const pngBuffer = await sharp(Buffer.from(svg)).png({ quality: 95 }).toBuffer();

  // Supabase Storage (production / Vercel)
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return uploadImageToSupabase(
      pngBuffer,
      `post-${postId}/slide-${slideNumber}.png`
    );
  }

  // Local filesystem (development fallback)
  await ensureUploadsDir();
  const filename = `post-${postId}-slide-${slideNumber}.png`;
  await fs.writeFile(path.join(UPLOADS_DIR, filename), pngBuffer);
  const serverUrl = process.env.SERVER_URL || "http://localhost:3000";
  return `${serverUrl}/uploads/carousels/${filename}`;
}
