-- ─────────────────────────────────────────────────────────────────────────────
-- InstaAI — Database Migration
-- Вставь этот SQL в: https://supabase.com/dashboard/project/uqgqnarwdlodcymbvcoi/sql/new
-- Нажми "Run" — готово.
-- ─────────────────────────────────────────────────────────────────────────────

-- Users
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  name          VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(50)  NOT NULL DEFAULT 'user',
  created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Instagram Accounts
CREATE TABLE IF NOT EXISTS instagram_accounts (
  id                 SERIAL PRIMARY KEY,
  user_id            INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  instagram_user_id  VARCHAR(255) NOT NULL,
  username           VARCHAR(255) NOT NULL,
  access_token       TEXT         NOT NULL,
  token_expires_at   TIMESTAMP,
  connected_at       TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Carousel Posts
CREATE TABLE IF NOT EXISTS carousel_posts (
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
);

-- Carousel Slides
CREATE TABLE IF NOT EXISTS carousel_slides (
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
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ig_accounts_user  ON instagram_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_user        ON carousel_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_status      ON carousel_posts(status);
CREATE INDEX IF NOT EXISTS idx_slides_post       ON carousel_slides(post_id);

-- Disable Row Level Security (проект использует server-side JWT, не Supabase Auth)
ALTER TABLE users               DISABLE ROW LEVEL SECURITY;
ALTER TABLE instagram_accounts  DISABLE ROW LEVEL SECURITY;
ALTER TABLE carousel_posts      DISABLE ROW LEVEL SECURITY;
ALTER TABLE carousel_slides     DISABLE ROW LEVEL SECURITY;
