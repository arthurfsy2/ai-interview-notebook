import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// 动态使用运行时的 DATABASE_URL（支持 UAT/生产环境）
// 注意：必须使用环境变量配置的数据库，不再回退到 SQLite
const databaseUrl = process.env.DATABASE_URL || "file:./dev.db";

if (!databaseUrl) {
  console.warn("DATABASE_URL not set, using default SQLite: file:./dev.db");
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // 根据环境变量屏蔽 query 日志
    log: process.env.NODE_ENV === 'development' 
      ? (process.env.DISABLE_PRISMA_QUERY_LOGS === 'true' ? ['error', 'warn'] : ['query', 'error', 'warn'])
      : ['error'],
    datasourceUrl: databaseUrl,
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
