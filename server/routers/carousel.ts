import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { carouselPosts, carouselSlides } from "../../drizzle/schema";
import { db } from "../db";
import { generateCarouselContent } from "../_core/llm";
import { generateSlideImage } from "../_core/imageGen";
import { protectedProcedure, publicProcedure, router } from "../trpc";

export const carouselRouter = router({
  // Generate carousel with AI
  generate: publicProcedure
    .input(
      z.object({
        niche: z.string().min(1),
        tone: z.string().min(1),
        language: z.string().default("English"),
        targetAudience: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const generated = await generateCarouselContent(input);

      let postId: number | null = null;

      if (ctx.user) {
        // Save to database for logged-in users
        const result = await db.insert(carouselPosts).values({
          userId: ctx.user.id,
          title: generated.title,
          caption: generated.caption,
          niche: input.niche,
          tone: input.tone,
          language: input.language,
          targetAudience: input.targetAudience,
          status: "generated",
        });
        postId = (result as any)[0].insertId as number;

        await db.insert(carouselSlides).values(
          generated.slides.map((s) => ({
            postId: postId!,
            slideNumber: s.slideNumber,
            heading: s.heading,
            content: s.content,
            visualDescription: s.visualDescription,
            colorScheme: s.colorScheme,
            textAlignment: s.textAlignment,
          }))
        );
      }

      return { postId, ...generated };
    }),

  // Generate slide images for a post
  generateImages: protectedProcedure
    .input(z.object({ postId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const [post] = await db
        .select()
        .from(carouselPosts)
        .where(
          and(
            eq(carouselPosts.id, input.postId),
            eq(carouselPosts.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!post) throw new TRPCError({ code: "NOT_FOUND" });

      const slides = await db
        .select()
        .from(carouselSlides)
        .where(eq(carouselSlides.postId, input.postId));

      const serverUrl =
        process.env.SERVER_URL || "http://localhost:3000";

      for (const slide of slides) {
        const relativeUrl = await generateSlideImage(
          input.postId,
          slide.slideNumber,
          slide.heading || "",
          slide.content || "",
          slide.colorScheme || "",
          slides.length
        );
        const imageUrl = `${serverUrl}${relativeUrl}`;

        await db
          .update(carouselSlides)
          .set({ imageUrl })
          .where(eq(carouselSlides.id, slide.id));
      }

      const updatedSlides = await db
        .select()
        .from(carouselSlides)
        .where(eq(carouselSlides.postId, input.postId));

      return { slides: updatedSlides };
    }),

  // Get user's carousel history
  list: protectedProcedure.query(async ({ ctx }) => {
    const posts = await db
      .select()
      .from(carouselPosts)
      .where(eq(carouselPosts.userId, ctx.user.id))
      .orderBy(desc(carouselPosts.createdAt))
      .limit(50);
    return posts;
  }),

  // Get single post with slides
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const [post] = await db
        .select()
        .from(carouselPosts)
        .where(
          and(
            eq(carouselPosts.id, input.id),
            eq(carouselPosts.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!post) throw new TRPCError({ code: "NOT_FOUND" });

      const slides = await db
        .select()
        .from(carouselSlides)
        .where(eq(carouselSlides.postId, input.id));

      return { ...post, slides };
    }),

  // Delete a post
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const [post] = await db
        .select({ id: carouselPosts.id })
        .from(carouselPosts)
        .where(
          and(
            eq(carouselPosts.id, input.id),
            eq(carouselPosts.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!post) throw new TRPCError({ code: "NOT_FOUND" });

      await db
        .delete(carouselSlides)
        .where(eq(carouselSlides.postId, input.id));
      await db.delete(carouselPosts).where(eq(carouselPosts.id, input.id));

      return { success: true };
    }),

  // Admin: get all posts
  adminList: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });

    const posts = await db
      .select()
      .from(carouselPosts)
      .orderBy(desc(carouselPosts.createdAt))
      .limit(200);
    return posts;
  }),
});
