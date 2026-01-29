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
