import { relations, sql } from "drizzle-orm";
import {
  boolean,
  datetime,
  int,
  mysqlTable,
  text,
  varchar,
} from "drizzle-orm/mysql-core";

// ─── Users ──────────────────────────────────────────────────────────────────

export const users = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull().default("user"),
  createdAt: datetime("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// ─── Instagram Accounts ───────────────────────────────────────────────────────

export const instagramAccounts = mysqlTable("instagram_accounts", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id")
    .notNull()
    .references(() => users.id),
  instagramUserId: varchar("instagram_user_id", { length: 255 }).notNull(),
  username: varchar("username", { length: 255 }).notNull(),
  accessToken: text("access_token").notNull(),
  tokenExpiresAt: datetime("token_expires_at"),
  connectedAt: datetime("connected_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// ─── Carousel Posts ───────────────────────────────────────────────────────────

export const carouselPosts = mysqlTable("carousel_posts", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id")
    .notNull()
    .references(() => users.id),
  instagramAccountId: int("instagram_account_id").references(
    () => instagramAccounts.id
  ),
  title: varchar("title", { length: 500 }).notNull(),
  caption: text("caption"),
  niche: varchar("niche", { length: 100 }),
  tone: varchar("tone", { length: 100 }),
  language: varchar("language", { length: 50 }),
  targetAudience: varchar("target_audience", { length: 255 }),
  status: varchar("status", { length: 50 }).notNull().default("draft"),
  instagramMediaId: varchar("instagram_media_id", { length: 255 }),
  publishedAt: datetime("published_at"),
  createdAt: datetime("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// ─── Carousel Slides ──────────────────────────────────────────────────────────

export const carouselSlides = mysqlTable("carousel_slides", {
  id: int("id").primaryKey().autoincrement(),
  postId: int("post_id")
    .notNull()
    .references(() => carouselPosts.id),
  slideNumber: int("slide_number").notNull(),
  heading: varchar("heading", { length: 500 }),
  content: text("content"),
  visualDescription: text("visual_description"),
  colorScheme: varchar("color_scheme", { length: 500 }),
  textAlignment: varchar("text_alignment", { length: 50 }).default("center"),
  imageUrl: text("image_url"),
  instagramMediaId: varchar("instagram_media_id", { length: 255 }),
});

// ─── Relations ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  instagramAccounts: many(instagramAccounts),
  carouselPosts: many(carouselPosts),
}));

export const instagramAccountsRelations = relations(
  instagramAccounts,
  ({ one, many }) => ({
    user: one(users, {
      fields: [instagramAccounts.userId],
      references: [users.id],
    }),
    carouselPosts: many(carouselPosts),
  })
);

export const carouselPostsRelations = relations(
  carouselPosts,
  ({ one, many }) => ({
    user: one(users, {
      fields: [carouselPosts.userId],
      references: [users.id],
    }),
    instagramAccount: one(instagramAccounts, {
      fields: [carouselPosts.instagramAccountId],
      references: [instagramAccounts.id],
    }),
    slides: many(carouselSlides),
  })
);

export const carouselSlidesRelations = relations(carouselSlides, ({ one }) => ({
  post: one(carouselPosts, {
    fields: [carouselSlides.postId],
    references: [carouselPosts.id],
  }),
}));

// ─── Types ────────────────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type InstagramAccount = typeof instagramAccounts.$inferSelect;
export type CarouselPost = typeof carouselPosts.$inferSelect;
export type CarouselSlide = typeof carouselSlides.$inferSelect;
