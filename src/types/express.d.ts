import type { Role } from '@/constants'

declare global {
	namespace Express {
		interface Request {
			userId?: string
			role?: Role
		}
	}
}
