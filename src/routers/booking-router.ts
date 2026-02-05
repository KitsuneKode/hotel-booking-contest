import { Router } from 'express'
import { STATUS } from 'generated/prisma/enums'
import { ErrorCodes } from '@/constants'
import { prisma } from '@/db'
import type { Bookings, Rooms } from '@/generated/prisma/client'
import { bookingSchema, searchBookingsQuerySchema } from '@/types'
import { AppError, errorResponse, successResponse } from '@/utils'

const router = Router()

type LockedRoom = Rooms & {
	ownerId: string
}

// type TypedBooking = Omit<Bookings, 'hotel' | 'created_at' | 'updated_at'> & {
// 	hotelName: string
// }

router.post('/bookings', async (req, res, next) => {
	const {
		success,
		data: bookingData,
		// error,
	} = bookingSchema.safeParse(req.body)

	if (!success) {
		res.status(400).json(errorResponse(ErrorCodes.INVALID_REQUEST))
		return
	}

	const userRole = req.role
	const userId = req.userId

	if (!userId) {
		throw new Error('Auth Bypass Error')
	}

	try {
		const { guests, roomId, checkInDate, checkOutDate } = bookingData
		const today = new Date()
		checkInDate.setHours(0, 0, 0, 0) // Reset to start of day
		checkOutDate.setHours(0, 0, 0, 0) // Reset to start of day
		today.setHours(0, 0, 0, 0) // Reset to start of day

		if (checkInDate <= today) {
			res.status(400).json(errorResponse(ErrorCodes.INVALID_DATES))
			return
		}
		const newBooking = await prisma.$transaction(async (tx) => {
			// Check room availability
			const rooms = await tx.$queryRaw<LockedRoom[]>`
            SELECT r.*, h."ownerId"
            FROM rooms r
            JOIN hotels h ON h.id = r."hotelId"
            WHERE r.id = ${roomId} 
            FOR UPDATE OF r
      `
			const room = rooms[0]

			if (!room) {
				throw new AppError(ErrorCodes.ROOM_NOT_FOUND)
			}

			if (userRole === 'owner' && room.ownerId === userId) {
				throw new AppError(ErrorCodes.FORBIDDEN)
			}

			const overlappingBookings = await tx.bookings.findFirst({
				where: {
					roomId,
					status: STATUS.confirmed,
					checkOutDate: { gt: checkInDate },
				},
			})

			if (overlappingBookings) {
				throw new AppError(ErrorCodes.ROOM_NOT_AVAILABLE)
			}

			if (guests > room.maxOccupancy) {
				throw new AppError(ErrorCodes.INVALID_CAPACITY)
			}

			const totalNights =
				(checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)

			const totalPrice = totalNights * room.pricePerNight.toNumber()

			console.log('totalPrice and totalNights', { totalNights, totalPrice })

			return await tx.bookings.create({
				data: {
					roomId,
					guests,
					checkInDate,
					checkOutDate,
					totalPrice,
					userId,
					hotelId: room.hotelId,
				},
				omit: {
					created_at: true,
					updated_at: true,
				},
			})
		})
		res.status(201).json(successResponse(newBooking))
	} catch (error) {
		if (error instanceof AppError) {
			switch (error.code) {
				case ErrorCodes.ROOM_NOT_FOUND:
					return res.status(404).json(errorResponse(ErrorCodes.ROOM_NOT_FOUND))
				case ErrorCodes.ROOM_NOT_AVAILABLE:
					return res
						.status(400)
						.json(errorResponse(ErrorCodes.ROOM_NOT_AVAILABLE))
				case ErrorCodes.INVALID_CAPACITY:
					return res
						.status(400)
						.json(errorResponse(ErrorCodes.INVALID_CAPACITY))
				case ErrorCodes.FORBIDDEN:
					return res.status(403).json(errorResponse(ErrorCodes.FORBIDDEN))
				default:
					return next(error)
			}
		}
		next(error)
	}
})

router.get('/bookings', async (req, res) => {
	const { success, data: searchBookingsData } =
		searchBookingsQuerySchema.safeParse(req.query)

	if (!success) {
		res.status(400).json(errorResponse(ErrorCodes.INVALID_REQUEST))
		return
	}

	const userId = req.userId

	const { status } = searchBookingsData

	if (!userId) {
		throw new Error('Auth Bypass Error')
	}

	// Using raw SQL query
	// const bookings = await prisma.$queryRaw<TypedBooking[]>`
	//             SELECT  b.id,
	//                     b."roomId",
	//                     b."hotelId",
	//                     r."roomNumber",
	//                     r."roomType",
	//                     b."checkInDate",
	//                     b."checkOutDate",
	//                     b.guests,
	//                     b."totalPrice",
	//                     b.status,
	//                     b."bookingDate",
	//                     h.name AS "hotelName"
	//             FROM bookings b
	//             JOIN hotels h ON h.id = b."hotelId"
	//             JOIN rooms r ON r.id = b."roomId"
	//             WHERE b."userId" = ${userId} AND status = ${status}
	// `

	const rawBookings = await prisma.bookings.findMany({
		where: { userId, status },
		include: {
			hotel: { select: { name: true } },
			room: { select: { roomType: true, roomNumber: true } },
		},
		omit: {
			created_at: true,
			updated_at: true,
		},
	})

	const formattedBookings = rawBookings.map((b) => ({
		id: b.id,
		roomId: b.roomId,
		hotelId: b.hotelId,
		hotelName: b.hotel.name,
		roomNumber: b.room.roomNumber,
		roomType: b.room.roomType,
		checkInDate: b.checkInDate,
		checkOutDate: b.checkOutDate,
		guests: b.guests,
		totalPrice: b.totalPrice,
		status: b.status,
		bookingDate: b.bookingDate,
	}))

	return res.status(200).json(successResponse(formattedBookings))
})

router.put('/bookings/:bookingId/cancel', async (req, res, next) => {
	const bookingId = req.params.bookingId as string

	try {
		const today = new Date()
		today.setHours(0, 0, 0, 0) // Reset to start of day

		// if (checkInDate <= today) {
		// 	res.status(400).json(errorResponse(ErrorCodes.INVALID_DATES))
		// 	return
		// }

		const cancelledBooking = await prisma.$transaction(async (tx) => {
			// Check room availability
			const bookings = await tx.$queryRaw<Bookings[]>`
            SELECT *
            FROM bookings
            WHERE bookings.id = ${bookingId} 
            FOR UPDATE
      `
			const booking = bookings[0]

			if (!booking) {
				throw new Error(ErrorCodes.BOOKING_NOT_FOUND)
			}

			const userId = req.userId

			if (!userId) {
				throw new Error('Auth Bypass Error')
			}

			if (booking.userId !== userId) {
				throw new Error(ErrorCodes.FORBIDDEN)
			}

			if (booking.status === STATUS.cancelled) {
				throw new Error(ErrorCodes.ALREADY_CANCELLED)
			}

			const hoursBeforeCheckIn =
				(booking.checkInDate.getTime() - today.getTime()) / (1000 * 60 * 60)

			if (hoursBeforeCheckIn < 24) {
				throw new Error(ErrorCodes.CANCELLATION_DEADLINE_PASSED)
			}

			return await tx.bookings.update({
				where: {
					id: bookingId,
					userId,
				},
				data: {
					status: STATUS.cancelled,
					cancelledAt: new Date(),
				},
				select: {
					id: true,
					status: true,
					cancelledAt: true,
				},
			})
		})

		return res.status(200).json(successResponse(cancelledBooking))
	} catch (error: unknown) {
		if (error instanceof AppError) {
			switch (error.code) {
				case ErrorCodes.CANCELLATION_DEADLINE_PASSED:
					return res
						.status(400)
						.json(errorResponse(ErrorCodes.CANCELLATION_DEADLINE_PASSED))
				case ErrorCodes.BOOKING_NOT_FOUND:
					return res
						.status(404)
						.json(errorResponse(ErrorCodes.BOOKING_NOT_FOUND))
				case ErrorCodes.FORBIDDEN:
					return res.status(403).json(errorResponse(ErrorCodes.FORBIDDEN))
				case ErrorCodes.ALREADY_CANCELLED:
					return res
						.status(400)
						.json(errorResponse(ErrorCodes.ALREADY_CANCELLED))

				default:
					next(error)
			}
		}

		next(error)
	}
})

export { router as bookingRouter }
