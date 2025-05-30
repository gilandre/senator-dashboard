import { PrismaClient } from '@prisma/client';

// Créer une instance globale de PrismaClient pour éviter trop de connexions en développement
const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Exporter une instance singleton de PrismaClient
export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma; 