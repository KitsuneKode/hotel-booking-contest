import type { NextFunction, Request, Response } from 'express'
import { ErrorCodes, type Role } from '@/constants'
import { errorResponse } from '@/utils'

export const authorizeRole =
	(role: Role) => (req: Request, res: Response, next: NextFunction) => {
		console.log('Authorizing role:', role, 'User role:', req.role)
		if (!req.role || req.role !== role) {
			res.status(403).json(errorResponse(ErrorCodes.FORBIDDEN))
			return
		}
		next()
	}
