import { Router } from 'express'
import { STATUS } from 'generated/prisma/enums'
import { ErrorCodes } from '@/constants'
import { prisma } from '@/db'
import type { Bookings, Rooms } from '@/generated/prisma/client'
import { bookingSchema, searchBookingsQuerySchema } from '@/types'
import { errorResponse, successResponse } from '@/utils'

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

		await prisma.$transaction(async (tx) => {
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
				res.status(404).json(errorResponse(ErrorCodes.ROOM_NOT_FOUND))
				return
			}

			const userRole = req.role
			const userId = req.userId

			if (!userId) {
				res.status(401).json(errorResponse(ErrorCodes.UNAUTHORIZED))
				return
			}

			if (userRole === 'owner' && room.ownerId === userId) {
				res.status(403).json(errorResponse(ErrorCodes.FORBIDDEN))
				return
			}

			const overlappingBookings = await tx.bookings.findFirst({
				where: {
					roomId,
					status: STATUS.confirmed,
					checkOutDate: { gt: checkInDate },
				},
			})

			if (overlappingBookings) {
				res.status(400).json(errorResponse(ErrorCodes.ROOM_NOT_AVAILABLE))
				return
			}

			if (guests > room.maxOccupancy) {
				res.status(400).json(errorResponse(ErrorCodes.INVALID_CAPACITY))
				return
			}

			const totalNights =
				(checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)

			const totalPrice = totalNights * room.pricePerNight.toNumber()

			console.log('totalPrice and totalNights', { totalNights, totalPrice })

			const newBooking = await tx.bookings.create({
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

			res.status(201).json(successResponse(newBooking))
		})
	} catch (error) {
		next(error)
	}
})

router.get('/bookings', async (req, res, next) => {
	const { success, data: searchBookingsData } =
		searchBookingsQuerySchema.safeParse(req.query)

	if (!success) {
		res.status(400).json(errorResponse(ErrorCodes.INVALID_REQUEST))
		return
	}

	try {
		const userId = req.userId
		const { status } = searchBookingsData
		if (!userId) {
			res.status(401).json(errorResponse(ErrorCodes.UNAUTHORIZED))
			return
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

		res.status(200).json(successResponse(formattedBookings))
	} catch (error) {
		next(error)
	}
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

		await prisma.$transaction(async (tx) => {
			// Check room availability
			const bookings = await tx.$queryRaw<Bookings[]>`
            SELECT *
            FROM bookings
            WHERE bookings.id = ${bookingId} 
            FOR UPDATE
      `
			const booking = bookings[0]

			if (!booking) {
				res.status(404).json(errorResponse(ErrorCodes.BOOKING_NOT_FOUND))
				return
			}

			const userId = req.userId

			if (!userId) {
				res.status(401).json(errorResponse(ErrorCodes.UNAUTHORIZED))
				return
			}

			if (booking.userId !== userId) {
				res.status(403).json(errorResponse(ErrorCodes.FORBIDDEN))
				return
			}

			if (booking.status === STATUS.cancelled) {
				res.status(400).json(errorResponse(ErrorCodes.ALREADY_CANCELLED))
				return
			}

			const hoursBeforeCheckIn =
				(booking.checkInDate.getTime() - today.getTime()) / (1000 * 60 * 60)

			if (hoursBeforeCheckIn < 24) {
				res
					.status(400)
					.json(errorResponse(ErrorCodes.CANCELLATION_DEADLINE_PASSED))
				return
			}

			const cancelledBooking = await tx.bookings.update({
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

			res.status(200).json(successResponse(cancelledBooking))
		})
	} catch (error) {
		next(error)
	}
})

export { router as bookingRouter }
