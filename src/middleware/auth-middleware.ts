import type { NextFunction, Request, Response } from 'express'
import jwt, { type JwtPayload } from 'jsonwebtoken'
import { ErrorCodes } from '@/constants'
import { errorResponse } from '@/utils'
import config from '@/utils/config'

export const authMiddleware = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const authHeader = req.headers.authorization
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		res.status(401).json(errorResponse(ErrorCodes.UNAUTHORIZED))
		return
	}
	const token = authHeader.split(' ')[1] as string
	try {
		const payload = jwt.verify(token, config.JWT_SECRET)
		const { userId, role } = payload as JwtPayload
		// console.log('Authenticated user:', { userId, role })
		req.userId = userId
		req.role = role
	} catch (err) {
		if (err instanceof jwt.JsonWebTokenError) {
			res.status(401).json(errorResponse(ErrorCodes.UNAUTHORIZED))
			return
		}
	}
	next()
}
