import type { NextFunction, Request, Response } from 'express'
import { ErrorCodes } from '@/constants'
import { errorResponse } from '@/utils'

export function errorMiddleware(
	err: Error,
	_req: Request,
	res: Response,
	_next: NextFunction,
) {
	console.error(err)

	res.status(500).json(errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR))
}
