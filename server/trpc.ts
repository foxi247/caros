import { initTRPC, TRPCError } from "@trpc/server";
import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { db } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import superjson from "superjson";

export type Context = {
  req: Request;
  res: Response;
  user: { id: number; email: string; name: string; role: string } | null;
};

export async function createContext({
  req,
  res,
}: {
  req: Request;
  res: Response;
}): Promise<Context> {
  let user: Context["user"] = null;

  const token =
    req.cookies?.["auth-token"] ||
    req.headers.authorization?.replace("Bearer ", "");

  if (token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
        userId: number;
      };
      const [found] = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
        })
        .from(users)
        .where(eq(users.id, payload.userId))
        .limit(1);
      if (found) user = found;
    } catch {
      // invalid/expired token — stay unauthenticated
    }
  }

  return { req, res, user };
}

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      message:
        error.cause instanceof Error
          ? error.cause.message
          : shape.message,
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const adminProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user || ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});
