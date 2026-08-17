import { app } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./db/prisma.js";

const server = app.listen(env.PORT, () => {
  console.log(`TheDays API listening on port ${env.PORT}`);
});

function shutDown(signal: NodeJS.Signals): void {
  console.log(`${signal} received; shutting down`);

  server.close(async (error) => {
    await prisma.$disconnect();

    if (error) {
      console.error(error);
      process.exit(1);
    }

    process.exit(0);
  });
}

process.on("SIGINT", () => shutDown("SIGINT"));
process.on("SIGTERM", () => shutDown("SIGTERM"));
