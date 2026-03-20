import { createClient } from "@supabase/supabase-js";

// Server-side admin client (service_role key — bypasses RLS)
export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  }
  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

const STORAGE_BUCKET = "carousel-images";

// Ensure the storage bucket exists
export async function ensureStorageBucket() {
  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase.storage.getBucket(STORAGE_BUCKET);
  if (!existing) {
    await supabase.storage.createBucket(STORAGE_BUCKET, {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024, // 5 MB
      allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"],
    });
  }
}

// Upload a PNG buffer → returns public URL
export async function uploadImageToSupabase(
  buffer: Buffer,
  path: string
): Promise<string> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, buffer, {
      contentType: "image/png",
      upsert: true,
    });
  if (error) throw error;

  const { data } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(path);
  return data.publicUrl;
}
