import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { users } from "../../drizzle/schema";
import { db } from "../db";
import { protectedProcedure, publicProcedure, router } from "../trpc";

const COOKIE_NAME = "auth-token";
const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 30, // 30 days
  path: "/",
};

function signToken(userId: number) {
  return jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: "30d" });
}

export const authRouter = router({
  me: publicProcedure.query(({ ctx }) => {
    if (!ctx.user) return null;
    return {
      id: ctx.user.id,
      email: ctx.user.email,
      name: ctx.user.name,
      role: ctx.user.role,
    };
  }),

  register: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        name: z.string().min(2).max(100),
        password: z.string().min(6).max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      if (existing.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Email already registered",
        });
      }

      const passwordHash = await bcrypt.hash(input.password, 12);

      const result = await db.insert(users).values({
        email: input.email,
        name: input.name,
        passwordHash,
        role: "user",
      });

      const userId = (result as any)[0].insertId as number;
      const token = signToken(userId);
      ctx.res.cookie(COOKIE_NAME, token, COOKIE_OPTS);

      return { id: userId, email: input.email, name: input.name, role: "user" };
    }),

  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        });
      }

      const valid = await bcrypt.compare(input.password, user.passwordHash);
      if (!valid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        });
      }

      const token = signToken(user.id);
      ctx.res.cookie(COOKIE_NAME, token, COOKIE_OPTS);

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      };
    }),

  logout: protectedProcedure.mutation(({ ctx }) => {
    ctx.res.clearCookie(COOKIE_NAME, { path: "/" });
    return { success: true };
  }),
});
