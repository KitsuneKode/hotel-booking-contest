import { z } from 'zod'

const envSchema = z.object({
	DATABASE_URL: z.url(),
	PORT: z.string().default('8080').transform(Number),
	JWT_SECRET: z.string().min(8),
})

// 2. Validate and Parse
const config = envSchema.parse({
	DATABASE_URL: process.env.DATABASE_URL,
	PORT: process.env.PORT,
	JWT_SECRET: process.env.JWT_SECRET,
})

// 3. Type-safe config usage
export default config
