import { Router } from 'express'
import { ErrorCodes } from '@/constants'
import { bookingSchema } from '@/types'
import { errorResponse } from '@/utils'

const router = Router()

router.post('/bookings', (req, res) => {
	const {
		success,
		data: bookingData,
		error,
	} = bookingSchema.safeParse(req.body)

	if (!success) {
		if (error.message === 'INVALID_DATES') {
			res.status(400).json(errorResponse(ErrorCodes.INVALID_DATES))
		} else res.status(400).json(errorResponse(ErrorCodes.INVALID_REQUEST))

		return
	}
})
export { router as bookingRouter }
