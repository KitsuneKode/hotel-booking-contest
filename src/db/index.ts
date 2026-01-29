import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/generated/prisma/client'
import config from '@/utils/config'

const adapter = new PrismaPg({
	connectionString: config.DATABASE_URL,
})

const globalForPrisma = global as unknown as {
	prisma: PrismaClient
}

const prisma =
	globalForPrisma.prisma ||
	new PrismaClient({
		adapter,
	})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export { prisma }
