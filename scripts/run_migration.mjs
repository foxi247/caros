/**
 * Applies supabase_migration.sql via HTTPS proxy
 * node scripts/run_migration.mjs
 */
import { createRequire } from 'module';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const { HttpsProxyAgent } = await import('https-proxy-agent');

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SK = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxZ3FuYXJ3ZGxvZGN5bWJ2Y29pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDAzODg3OSwiZXhwIjoyMDg5NjE0ODc5fQ.Nzo3iOKeRbYvig-m6KIQwON3laymGiG_b3ThUtIAi7c";
const BASE = "uqgqnarwdlodcymbvcoi.supabase.co";

const proxy = process.env.https_proxy || process.env.HTTPS_PROXY;
const agent = proxy ? new HttpsProxyAgent(proxy) : undefined;

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: BASE,
      path,
      method,
      agent,
      headers: {
        'apikey': SK,
        'Authorization': `Bearer ${SK}`,
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };
    const req = https.request(opts, res => {
      let out = '';
      res.on('data', d => out += d);
      res.on('end', () => resolve({ status: res.statusCode, body: out }));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// Each DDL statement as separate RPC call
const statements = [
  `CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    email         VARCHAR(255) NOT NULL UNIQUE,
    name          VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(50)  NOT NULL DEFAULT 'user',
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP    NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS instagram_accounts (
    id                 SERIAL PRIMARY KEY,
    user_id            INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    instagram_user_id  VARCHAR(255) NOT NULL,
    username           VARCHAR(255) NOT NULL,
    access_token       TEXT         NOT NULL,
    token_expires_at   TIMESTAMP,
    connected_at       TIMESTAMP    NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS carousel_posts (
    id                   SERIAL PRIMARY KEY,
    user_id              INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    instagram_account_id INTEGER      REFERENCES instagram_accounts(id) ON DELETE SET NULL,
    title                VARCHAR(500) NOT NULL,
    caption              TEXT,
    niche                VARCHAR(100),
    tone                 VARCHAR(100),
    language             VARCHAR(50),
    target_audience      VARCHAR(255),
    status               VARCHAR(50)  NOT NULL DEFAULT 'draft',
    instagram_media_id   VARCHAR(255),
    published_at         TIMESTAMP,
    created_at           TIMESTAMP    NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS carousel_slides (
    id                 SERIAL PRIMARY KEY,
    post_id            INTEGER      NOT NULL REFERENCES carousel_posts(id) ON DELETE CASCADE,
    slide_number       INTEGER      NOT NULL,
    heading            VARCHAR(500),
    content            TEXT,
    visual_description TEXT,
    color_scheme       VARCHAR(500),
    text_alignment     VARCHAR(50)  DEFAULT 'center',
    image_url          TEXT,
    instagram_media_id VARCHAR(255)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_ig_accounts_user ON instagram_accounts(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_posts_user       ON carousel_posts(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_posts_status     ON carousel_posts(status)`,
  `CREATE INDEX IF NOT EXISTS idx_slides_post      ON carousel_slides(post_id)`,
  `ALTER TABLE users               DISABLE ROW LEVEL SECURITY`,
  `ALTER TABLE instagram_accounts  DISABLE ROW LEVEL SECURITY`,
  `ALTER TABLE carousel_posts      DISABLE ROW LEVEL SECURITY`,
  `ALTER TABLE carousel_slides     DISABLE ROW LEVEL SECURITY`,
];

// Step 1: create exec_sql bootstrap function via a known approach
async function bootstrap() {
  // Try to create exec_sql function by calling postgres functions
  const bootstrapSQL = `
    CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
    RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
    DECLARE result json;
    BEGIN EXECUTE sql; RETURN '{"ok":true}'::json; END; $$;
  `;
  // We'll use the pg_notify trick or another approach
  // Actually, let's try using the auth.uid() override or direct schema access
  const r = await request('POST', '/rest/v1/rpc/exec_sql', { sql: 'SELECT 1' });
  console.log('exec_sql probe:', r.status, r.body.slice(0,100));
  return r.status === 200;
}

async function main() {
  console.log('Checking exec_sql availability...');
  const available = await bootstrap();

  if (!available) {
    console.log('\nCannot execute DDL via REST API from this environment.');
    console.log('\nPlease run the SQL manually:');
    console.log('URL: https://supabase.com/dashboard/project/uqgqnarwdlodcymbvcoi/sql/new');
    console.log('\nSQL file: supabase_migration.sql (in project root)');
    return;
  }

  console.log('\nRunning migration statements...');
  for (const sql of statements) {
    const r = await request('POST', '/rest/v1/rpc/exec_sql', { sql });
    const label = sql.slice(7, 60).replace(/\s+/g, ' ').trim();
    if (r.status === 200) {
      console.log(`  ✓ ${label}...`);
    } else {
      console.log(`  ✗ ${label}... [${r.status}] ${r.body.slice(0,100)}`);
    }
  }
  console.log('\nDone!');
}

main().catch(console.error);
