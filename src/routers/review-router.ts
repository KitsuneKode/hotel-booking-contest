import { Router } from 'express'
import { STATUS } from 'generated/prisma/enums'
import { ErrorCodes } from '@/constants'
import { prisma } from '@/db'
import type { Hotels } from '@/generated/prisma/client'
import { createReviewSchema } from '@/types'
import { AppError, errorResponse, successResponse } from '@/utils'

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
		const review = await prisma.$transaction(async (tx) => {
			const booking = await tx.bookings.findUnique({
				where: { id: bookingId },
				include: {
					reviews: true,
				},
			})

			if (!booking) {
				throw new AppError(ErrorCodes.BOOKING_NOT_FOUND)
			}

			if (booking.userId !== req.userId) {
				throw new AppError(ErrorCodes.FORBIDDEN)
			}

			if (
				booking.checkOutDate.getTime() > today.getTime() ||
				booking.status !== STATUS.confirmed
			) {
				throw new AppError(ErrorCodes.BOOKING_NOT_ELIGIBLE)
			}

			if (booking.reviews) {
				throw new AppError(ErrorCodes.ALREADY_REVIEWED)
			}

			const hotels = await tx.$queryRaw<Hotels[]>`
          SELECT id FROM hotels 
          WHERE id = ${booking.hotelId}
          FOR UPDATE
    `
			const hotel = hotels[0]
			if (!hotel) {
				throw new AppError(ErrorCodes.HOTEL_NOT_FOUND)
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
			return newReview
		})
		res.status(201).json(successResponse(review))
	} catch (error) {
		next(error)
	}
})

export { router as reviewRouter }
