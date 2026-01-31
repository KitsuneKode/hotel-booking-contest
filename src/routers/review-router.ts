import { Router } from 'express'
import { STATUS } from 'generated/prisma/enums'
import { ErrorCodes } from '@/constants'
import { prisma } from '@/db'
import type { Hotels } from '@/generated/prisma/client'
import { createReviewSchema } from '@/types'
import { errorResponse, successResponse } from '@/utils'

const router = Router()

router.post('/reviews', async (req, res, next) => {
	const {
		success,
		data: reviewData,
		error,
	} = createReviewSchema.safeParse(req.body)

	if (!success) {
		if (error.message === 'INVALID_BOOKING_ID')
			res.status(404).json(errorResponse(ErrorCodes.BOOKING_NOT_FOUND))
		else res.status(400).json(errorResponse(ErrorCodes.INVALID_REQUEST))

		return
	}
	try {
		const today = new Date()
		today.setHours(0, 0, 0, 0) // Reset to start of day
		const userId = req.userId
		if (!userId) {
			res.status(401).json(errorResponse(ErrorCodes.UNAUTHORIZED))
			return
		}

		const { rating, comment, bookingId } = reviewData
		await prisma.$transaction(async (tx) => {
			const booking = await tx.bookings.findUnique({
				where: { id: bookingId },
				include: {
					reviews: true,
				},
			})

			if (!booking) {
				res.status(404).json(errorResponse(ErrorCodes.BOOKING_NOT_FOUND))
				return
			}

			if (booking.userId !== req.userId) {
				res.status(403).json(errorResponse(ErrorCodes.FORBIDDEN))
				return
			}

			if (
				booking.checkOutDate.getTime() > today.getTime() ||
				booking.status !== STATUS.confirmed
			) {
				res.status(400).json(errorResponse(ErrorCodes.BOOKING_NOT_ELIGIBLE))
				return
			}

			if (booking.reviews) {
				res.status(400).json(errorResponse(ErrorCodes.ALREADY_REVIEWED))
				return
			}

			const hotels = await tx.$queryRaw<Hotels[]>`
          SELECT id FROM hotels 
          WHERE id = ${booking.hotelId}
          FOR UPDATE
    `
			const hotel = hotels[0]
			if (!hotel) {
				res.json(400).json(errorResponse(ErrorCodes.HOTEL_NOT_FOUND))
				return
			}

			const newReview = await tx.reviews.create({
				data: {
					bookingId,
					rating,
					comment,
					userId,
					hotelId: booking.hotelId,
				},
				omit: {
					created_at: true,
					updated_at: true,
				},
			})

			const stats = await tx.reviews.aggregate({
				where: { hotelId: booking.hotelId },
				_avg: { rating: true },
				_count: { id: true },
			})

			const newRating =
				(hotel.rating.toNumber() * hotel.totalReviews + rating) /
				(hotel.totalReviews + 1)
			console.log('Stats and nRating', stats, newRating)

			await tx.hotels.update({
				where: { id: booking.hotelId },
				data: {
					rating: stats._avg.rating || 0,
					totalReviews: stats._count.id,
				},
			})

			res.status(201).json(successResponse(newReview))
		})
	} catch (error) {
		next(error)
	}
})

export { router as reviewRouter }
