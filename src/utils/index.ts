import type { ErrorCode } from '@/constants'

export const errorResponse = (error: ErrorCode) => {
	return {
		success: false,
		data: null,
		error,
	}
}

export const successResponse = (data: object) => {
	return {
		success: true,
		data,
		error: null,
	}
}

export class AppError extends Error {
	public readonly code: ErrorCode

	constructor(code: ErrorCode, message?: string) {
		super(code || message)
		this.code = code

		Object.setPrototypeOf(this, new.target.prototype)
		Error.captureStackTrace(this)
	}
}
