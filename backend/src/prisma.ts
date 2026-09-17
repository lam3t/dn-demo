import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

// Luôn giữ singleton PrismaClient trên globalThis cho cả Serverless và Local
globalForPrisma.prisma = prisma;

export default prisma;

