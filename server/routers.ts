import { router } from "./trpc";
import { authRouter } from "./routers/auth";
import { carouselRouter } from "./routers/carousel";
import { instagramRouter } from "./routers/instagram";

export const appRouter = router({
  auth: authRouter,
  carousel: carouselRouter,
  instagram: instagramRouter,
});

export type AppRouter = typeof appRouter;
