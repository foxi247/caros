import { app } from "./app";
import { ensureUploadsDir } from "./_core/imageGen";

const PORT = process.env.PORT || 3000;

async function start() {
  await ensureUploadsDir();
  app.listen(PORT, () => {
    console.log(`\n✅ Server running at http://localhost:${PORT}`);
    console.log(`   tRPC API: http://localhost:${PORT}/api/trpc`);
  });
}

start().catch(console.error);
