/**
 * Создаёт все таблицы в Supabase через REST API (service_role key)
 * Запускать: node scripts/migrate.mjs
 */

const SUPABASE_URL = "https://uqgqnarwdlodcymbvcoi.supabase.co";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxZ3FuYXJ3ZGxvZGN5bWJ2Y29pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDAzODg3OSwiZXhwIjoyMDg5NjE0ODc5fQ.Nzo3iOKeRbYvig-m6KIQwON3laymGiG_b3ThUtIAi7c";

const MIGRATION_SQL = `
-- ─── Users ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  email       VARCHAR(255) NOT NULL UNIQUE,
  name        VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role        VARCHAR(50)  NOT NULL DEFAULT 'user',
  created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ─── Instagram Accounts ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS instagram_accounts (
  id                   SERIAL PRIMARY KEY,
  user_id              INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  instagram_user_id    VARCHAR(255) NOT NULL,
  username             VARCHAR(255) NOT NULL,
  access_token         TEXT         NOT NULL,
  token_expires_at     TIMESTAMP,
  connected_at         TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ─── Carousel Posts ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS carousel_posts (
  id                    SERIAL PRIMARY KEY,
  user_id               INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  instagram_account_id  INTEGER      REFERENCES instagram_accounts(id) ON DELETE SET NULL,
  title                 VARCHAR(500) NOT NULL,
  caption               TEXT,
  niche                 VARCHAR(100),
  tone                  VARCHAR(100),
  language              VARCHAR(50),
  target_audience       VARCHAR(255),
  status                VARCHAR(50)  NOT NULL DEFAULT 'draft',
  instagram_media_id    VARCHAR(255),
  published_at          TIMESTAMP,
  created_at            TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ─── Carousel Slides ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS carousel_slides (
  id                   SERIAL PRIMARY KEY,
  post_id              INTEGER      NOT NULL REFERENCES carousel_posts(id) ON DELETE CASCADE,
  slide_number         INTEGER      NOT NULL,
  heading              VARCHAR(500),
  content              TEXT,
  visual_description   TEXT,
  color_scheme         VARCHAR(500),
  text_alignment       VARCHAR(50)  DEFAULT 'center',
  image_url            TEXT,
  instagram_media_id   VARCHAR(255)
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_instagram_accounts_user_id ON instagram_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_carousel_posts_user_id     ON carousel_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_carousel_posts_status      ON carousel_posts(status);
CREATE INDEX IF NOT EXISTS idx_carousel_slides_post_id    ON carousel_slides(post_id);
`;

async function runSQL(sql) {
  // Supabase allows arbitrary SQL via the pg endpoint when authenticated with service_role
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/rpc/exec_sql`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ sql }),
    }
  );

  if (response.ok) return await response.json();

  // If exec_sql doesn't exist, create it first then re-run
  if (response.status === 404 || response.status === 400) {
    return null; // signal to bootstrap
  }

  const err = await response.text();
  throw new Error(`SQL error ${response.status}: ${err}`);
}

async function bootstrap() {
  console.log("Creating exec_sql helper function...");
  // Try creating the function via the pg schema
  const createFn = `
    CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      EXECUTE sql;
    END;
    $$;
  `;

  // Try via Supabase's internal query endpoint
  const res = await fetch(`${SUPABASE_URL}/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ query: createFn }),
  });
  console.log("Bootstrap response:", res.status, await res.text().catch(() => ""));
}

async function main() {
  console.log("🚀 Starting Supabase migration...\n");

  // First attempt
  const result = await runSQL(MIGRATION_SQL);

  if (result === null) {
    console.log("exec_sql function not found, trying to bootstrap...");
    await bootstrap();
    // Retry
    const retry = await runSQL(MIGRATION_SQL);
    if (retry === null) {
      console.log("\n⚠️  Cannot run SQL via REST API from this environment.");
      console.log("Please run the following SQL in Supabase SQL Editor:");
      console.log("https://supabase.com/dashboard/project/uqgqnarwdlodcymbvcoi/sql/new\n");
      console.log("─".repeat(60));
      console.log(MIGRATION_SQL);
      console.log("─".repeat(60));
      return;
    }
  }

  console.log("✅ Tables created successfully!");
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
