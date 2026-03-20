import { TRPCError } from "@trpc/server";
import axios from "axios";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import {
  carouselPosts,
  carouselSlides,
  instagramAccounts,
} from "../../drizzle/schema";
import { db } from "../db";
import { protectedProcedure, router } from "../trpc";

const GRAPH_API = "https://graph.facebook.com/v18.0";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function exchangeCodeForToken(code: string) {
  const { data } = await axios.get(
    "https://api.instagram.com/oauth/access_token",
    {
      params: {
        client_id: process.env.INSTAGRAM_APP_ID,
        client_secret: process.env.INSTAGRAM_APP_SECRET,
        grant_type: "authorization_code",
        redirect_uri: process.env.INSTAGRAM_REDIRECT_URI,
        code,
      },
    }
  );
  return data as { access_token: string; user_id: number };
}

async function getLongLivedToken(shortToken: string) {
  const { data } = await axios.get(`${GRAPH_API}/oauth/access_token`, {
    params: {
      grant_type: "fb_exchange_token",
      client_id: process.env.INSTAGRAM_APP_ID,
      client_secret: process.env.INSTAGRAM_APP_SECRET,
      fb_exchange_token: shortToken,
    },
  });
  return data as { access_token: string; expires_in: number };
}

async function getInstagramProfile(userId: number, token: string) {
  const { data } = await axios.get(`${GRAPH_API}/${userId}`, {
    params: { fields: "id,username", access_token: token },
  });
  return data as { id: string; username: string };
}

async function createImageContainer(
  igUserId: string,
  token: string,
  imageUrl: string,
  isCarouselItem = true
) {
  const { data } = await axios.post(`${GRAPH_API}/${igUserId}/media`, null, {
    params: {
      image_url: imageUrl,
      is_carousel_item: isCarouselItem,
      access_token: token,
    },
  });
  return data.id as string;
}

async function createCarouselContainer(
  igUserId: string,
  token: string,
  childrenIds: string[],
  caption: string
) {
  const { data } = await axios.post(`${GRAPH_API}/${igUserId}/media`, null, {
    params: {
      media_type: "CAROUSEL",
      children: childrenIds.join(","),
      caption,
      access_token: token,
    },
  });
  return data.id as string;
}

async function publishContainer(
  igUserId: string,
  token: string,
  creationId: string
) {
  const { data } = await axios.post(
    `${GRAPH_API}/${igUserId}/media_publish`,
    null,
    {
      params: { creation_id: creationId, access_token: token },
    }
  );
  return data.id as string;
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const instagramRouter = router({
  // Get OAuth URL to connect Instagram
  getAuthUrl: protectedProcedure.query(() => {
    const appId = process.env.INSTAGRAM_APP_ID;
    const redirectUri = encodeURIComponent(
      process.env.INSTAGRAM_REDIRECT_URI!
    );
    const scope = encodeURIComponent(
      "user_profile,user_media,instagram_basic,instagram_content_publish"
    );
    return `https://api.instagram.com/oauth/authorize?client_id=${appId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code`;
  }),

  // Handle OAuth callback (called after user authorizes)
  connect: protectedProcedure
    .input(z.object({ code: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const shortTokenData = await exchangeCodeForToken(input.code);
      const longTokenData = await getLongLivedToken(shortTokenData.access_token);
      const profile = await getInstagramProfile(
        shortTokenData.user_id,
        longTokenData.access_token
      );

      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + longTokenData.expires_in);

      // Check if already connected
      const existing = await db
        .select({ id: instagramAccounts.id })
        .from(instagramAccounts)
        .where(
          and(
            eq(instagramAccounts.userId, ctx.user.id),
            eq(instagramAccounts.instagramUserId, profile.id)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(instagramAccounts)
          .set({
            accessToken: longTokenData.access_token,
            tokenExpiresAt: expiresAt,
            username: profile.username,
          })
          .where(eq(instagramAccounts.id, existing[0].id));
        return { id: existing[0].id, username: profile.username };
      }

      const result = await db.insert(instagramAccounts).values({
        userId: ctx.user.id,
        instagramUserId: profile.id,
        username: profile.username,
        accessToken: longTokenData.access_token,
        tokenExpiresAt: expiresAt,
      });

      return {
        id: (result as any)[0].insertId as number,
        username: profile.username,
      };
    }),

  // List connected Instagram accounts
  getAccounts: protectedProcedure.query(async ({ ctx }) => {
    return db
      .select({
        id: instagramAccounts.id,
        username: instagramAccounts.username,
        instagramUserId: instagramAccounts.instagramUserId,
        connectedAt: instagramAccounts.connectedAt,
        tokenExpiresAt: instagramAccounts.tokenExpiresAt,
      })
      .from(instagramAccounts)
      .where(eq(instagramAccounts.userId, ctx.user.id));
  }),

  // Disconnect Instagram account
  disconnect: protectedProcedure
    .input(z.object({ accountId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .delete(instagramAccounts)
        .where(
          and(
            eq(instagramAccounts.id, input.accountId),
            eq(instagramAccounts.userId, ctx.user.id)
          )
        );
      return { success: true };
    }),

  // Publish carousel to Instagram
  publish: protectedProcedure
    .input(
      z.object({
        postId: z.number(),
        accountId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get the post
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

      if (!post) throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });

      // Get slides with images
      const slides = await db
        .select()
        .from(carouselSlides)
        .where(eq(carouselSlides.postId, input.postId));

      const slidesWithImages = slides.filter((s) => s.imageUrl);
      if (slidesWithImages.length < 2) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Please generate slide images first. Minimum 2 images required.",
        });
      }

      // Get Instagram account
      const [account] = await db
        .select()
        .from(instagramAccounts)
        .where(
          and(
            eq(instagramAccounts.id, input.accountId),
            eq(instagramAccounts.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!account) throw new TRPCError({ code: "NOT_FOUND", message: "Instagram account not found" });

      // Instagram allows max 10 carousel items
      const publishSlides = slidesWithImages.slice(0, 10);

      // Create image containers for each slide
      const containerIds: string[] = [];
      for (const slide of publishSlides) {
        const containerId = await createImageContainer(
          account.instagramUserId,
          account.accessToken,
          slide.imageUrl!
        );
        containerIds.push(containerId);

        await db
          .update(carouselSlides)
          .set({ instagramMediaId: containerId })
          .where(eq(carouselSlides.id, slide.id));
      }

      // Create carousel container
      const carouselContainerId = await createCarouselContainer(
        account.instagramUserId,
        account.accessToken,
        containerIds,
        post.caption || post.title
      );

      // Publish
      const mediaId = await publishContainer(
        account.instagramUserId,
        account.accessToken,
        carouselContainerId
      );

      // Update post status
      await db
        .update(carouselPosts)
        .set({
          status: "published",
          instagramMediaId: mediaId,
          instagramAccountId: input.accountId,
          publishedAt: new Date(),
        })
        .where(eq(carouselPosts.id, input.postId));

      return { success: true, mediaId };
    }),
});
