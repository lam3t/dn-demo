import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Đảm bảo URL kết nối dùng Transaction Pooler (port 6543) thay vì Session Pooler (port 5432, max 15 clients)
let dbUrl = process.env.DATABASE_URL;
if (dbUrl) {
  // Chuyển port 5432 sang port 6543 nếu đang dùng Supabase pooler
  if (dbUrl.includes('pooler.supabase.com:5432')) {
    dbUrl = dbUrl.replace('pooler.supabase.com:5432', 'pooler.supabase.com:6543');
  }
  // Đảm bảo có tham số pgbouncer=true
  if (dbUrl.includes('pooler.supabase.com:6543') && !dbUrl.includes('pgbouncer=true')) {
    dbUrl += (dbUrl.includes('?') ? '&' : '?') + 'pgbouncer=true';
  }
  // Trên môi trường Serverless (Vercel), giới hạn 1 kết nối trên mỗi serverless container để không cạn kiệt pool
  if (!dbUrl.includes('connection_limit=')) {
    dbUrl += (dbUrl.includes('?') ? '&' : '?') + 'connection_limit=1';
  }
}

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: dbUrl ? { db: { url: dbUrl } } : undefined,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

// Luôn giữ singleton PrismaClient trên globalThis cho cả Serverless và Local
globalForPrisma.prisma = prisma;

export default prisma;

