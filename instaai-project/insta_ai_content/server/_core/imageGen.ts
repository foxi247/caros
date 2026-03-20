import sharp from "sharp";
import path from "path";
import fs from "fs/promises";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads", "carousels");

export async function ensureUploadsDir() {
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
  }
}

function parseColorScheme(colorScheme: string) {
  const defaults = { primary: "#6366f1", secondary: "#818cf8", text: "#ffffff" };
  if (!colorScheme) return defaults;
  return {
    primary: colorScheme.match(/primary:\s*(#[0-9a-fA-F]{3,6})/)?.[1] || defaults.primary,
    secondary: colorScheme.match(/secondary:\s*(#[0-9a-fA-F]{3,6})/)?.[1] || defaults.secondary,
    text: colorScheme.match(/text:\s*(#[0-9a-fA-F]{3,6})/)?.[1] || defaults.text,
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

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildSvg(
  heading: string,
  content: string,
  colorScheme: string,
  slideNumber: number,
  slideCount: number
): string {
  const colors = parseColorScheme(colorScheme);
  const W = 1080;
  const H = 1080;

  const headingLines = wrapText(heading || "", 22);
  const contentLines = wrapText(content || "", 38);

  const headingY = 360;
  const lineHeight = 64;
  const contentStartY = headingY + headingLines.length * lineHeight + 48;
  const contentLineHeight = 44;

  const headingSvg = headingLines
    .map(
      (line, i) =>
        `<text x="540" y="${headingY + i * lineHeight}" text-anchor="middle"
          font-family="'Arial Black', Arial, sans-serif" font-size="52" font-weight="900"
          fill="${escapeXml(colors.text)}" filter="url(#shadow)">${escapeXml(line)}</text>`
    )
    .join("\n");

  const contentSvg = contentLines
    .slice(0, 6)
    .map(
      (line, i) =>
        `<text x="540" y="${contentStartY + i * contentLineHeight}" text-anchor="middle"
          font-family="Arial, sans-serif" font-size="32" font-weight="400"
          fill="${escapeXml(colors.text)}" opacity="0.92">${escapeXml(line)}</text>`
    )
    .join("\n");

  const dots = Array.from({ length: slideCount }, (_, i) =>
    i === slideNumber - 1
      ? `<circle cx="${540 - (slideCount * 20) / 2 + i * 20 + 10}" cy="1030" r="6" fill="${escapeXml(colors.text)}" opacity="1"/>`
      : `<circle cx="${540 - (slideCount * 20) / 2 + i * 20 + 10}" cy="1030" r="4" fill="${escapeXml(colors.text)}" opacity="0.4"/>`
  ).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${escapeXml(colors.primary)};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${escapeXml(colors.secondary)};stop-opacity:1" />
    </linearGradient>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="rgba(0,0,0,0.3)"/>
    </filter>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <circle cx="100" cy="100" r="180" fill="${escapeXml(colors.text)}" opacity="0.06"/>
  <circle cx="980" cy="980" r="220" fill="${escapeXml(colors.text)}" opacity="0.06"/>
  <circle cx="980" cy="100" r="120" fill="${escapeXml(colors.text)}" opacity="0.04"/>
  <rect x="48" y="48" width="72" height="36" rx="18" fill="${escapeXml(colors.text)}" opacity="0.18"/>
  <text x="84" y="71" text-anchor="middle" font-family="Arial, sans-serif"
    font-size="18" font-weight="700" fill="${escapeXml(colors.text)}">${slideNumber}/${slideCount}</text>
  ${headingSvg}
  <rect x="440" y="${contentStartY - 24}" width="200" height="3" rx="2" fill="${escapeXml(colors.text)}" opacity="0.4"/>
  ${contentSvg}
  ${dots}
</svg>`;
}

// ─── Cloudinary upload ────────────────────────────────────────────────────────

async function uploadToCloudinary(buffer: Buffer, publicId: string): Promise<string> {
  // Dynamic import to avoid errors when cloudinary is not configured
  const { v2: cloudinary } = await import("cloudinary");
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        { public_id: publicId, folder: "carosel", resource_type: "image", overwrite: true },
        (error, result) => {
          if (error) reject(error);
          else resolve(result!.secure_url);
        }
      )
      .end(buffer);
  });
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function generateSlideImage(
  postId: number,
  slideNumber: number,
  heading: string,
  content: string,
  colorScheme: string,
  slideCount: number
): Promise<string> {
  const svg = buildSvg(heading, content, colorScheme, slideNumber, slideCount);
  const pngBuffer = await sharp(Buffer.from(svg)).png({ quality: 95 }).toBuffer();

  // Cloudinary mode (Vercel + production)
  if (process.env.CLOUDINARY_CLOUD_NAME) {
    return uploadToCloudinary(pngBuffer, `post-${postId}-slide-${slideNumber}`);
  }

  // Local filesystem mode (development)
  await ensureUploadsDir();
  const filename = `post-${postId}-slide-${slideNumber}.png`;
  await fs.writeFile(path.join(UPLOADS_DIR, filename), pngBuffer);
  const serverUrl = process.env.SERVER_URL || "http://localhost:3000";
  return `${serverUrl}/uploads/carousels/${filename}`;
}
