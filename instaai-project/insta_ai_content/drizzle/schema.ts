import { relations, sql } from "drizzle-orm";
import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

// ─── Users ──────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull().default("user"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Instagram Accounts ───────────────────────────────────────────────────────

export const instagramAccounts = pgTable("instagram_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  instagramUserId: varchar("instagram_user_id", { length: 255 }).notNull(),
  username: varchar("username", { length: 255 }).notNull(),
  accessToken: text("access_token").notNull(),
  tokenExpiresAt: timestamp("token_expires_at"),
  connectedAt: timestamp("connected_at").notNull().defaultNow(),
});

// ─── Carousel Posts ───────────────────────────────────────────────────────────

export const carouselPosts = pgTable("carousel_posts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  instagramAccountId: integer("instagram_account_id").references(
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
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Carousel Slides ──────────────────────────────────────────────────────────

export const carouselSlides = pgTable("carousel_slides", {
  id: serial("id").primaryKey(),
  postId: integer("post_id")
    .notNull()
    .references(() => carouselPosts.id),
  slideNumber: integer("slide_number").notNull(),
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
