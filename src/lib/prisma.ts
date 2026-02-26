import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  try {
    if (process.env.TURSO_DATABASE_URL) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { PrismaLibSql } = require("@prisma/adapter-libsql");
      const adapter = new PrismaLibSql({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
      });
      return new PrismaClient({ adapter } as any);
    }
  } catch (e) {
    console.error("Failed to create Turso adapter, falling back to default:", e);
  }
  return new PrismaClient();
}

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = createPrismaClient();
}

export const prisma = globalForPrisma.prisma;
export default prisma;
