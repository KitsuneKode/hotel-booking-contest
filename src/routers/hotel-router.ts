import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client'
import { Router } from 'express'
import { Prisma } from 'generated/prisma/client'
import { ErrorCodes } from '@/constants'
import { prisma } from '@/db'
import { authorizeRole } from '@/middleware/role-middleware'
import {
	createHotelSchema,
	createRoomSchema,
	type HotelSearchResult,
	searchHotelsQuerySchema,
} from '@/types'
import { errorResponse, successResponse } from '@/utils'

const router = Router()

router.post('/hotels', authorizeRole('owner'), async (req, res, next) => {
	const {
		success,
		data: hotelData,
		error,
	} = createHotelSchema.safeParse(req.body)

	if (!success) {
		console.error(error)
		res.status(400).json(errorResponse(ErrorCodes.INVALID_REQUEST))
		return
	}

	try {
		const { name, description, city, country, amenities } = hotelData
		const userId = req.userId

		if (!userId) {
			throw new Error(ErrorCodes.UNAUTHORIZED)
		}

		const newHotel = await prisma.hotels.create({
			data: {
				name,
				description,
				city,
				country,
				ownerId: userId,
				amenities: amenities || [],
			},
			omit: {
				created_at: true,
				updated_at: true,
			},
		})

		res.status(201).json(successResponse(newHotel))
	} catch (error) {
		next(error)
	}
})

router.post(
	'/hotels/:hotelId/rooms',
	authorizeRole('owner'),
	async (req, res, next) => {
		const hotelId = req.params.hotelId as string

		const { success, data: roomData } = createRoomSchema.safeParse(req.body)

		if (!success || !hotelId) {
			res.status(400).json(errorResponse(ErrorCodes.INVALID_REQUEST))
			return
		}

		try {
			const { roomType, roomNumber, maxOccupancy, pricePerNight } = roomData
			const userId = req.userId

			if (!userId) {
				throw new Error(ErrorCodes.UNAUTHORIZED)
			}

			await prisma.$transaction(async (tx) => {
				const existingHotel = await tx.hotels.findUnique({
					where: {
						id: hotelId,
					},
				})

				if (!existingHotel) {
					res.status(404).json(errorResponse(ErrorCodes.HOTEL_NOT_FOUND))
					return
				} else if (existingHotel.ownerId !== userId) {
					res.status(403).json(errorResponse(ErrorCodes.FORBIDDEN))
					return
				}

				const newRoom = await tx.rooms.create({
					data: {
						roomType,
						roomNumber,
						maxOccupancy,
						pricePerNight,
						hotelId,
					},
					omit: {
						created_at: true,
						updated_at: true,
					},
				})
				res.status(201).json(successResponse(newRoom))
			})
		} catch (error) {
			if (error instanceof PrismaClientKnownRequestError) {
				if (error.code === 'P2002') {
					res.status(400).json(errorResponse(ErrorCodes.ROOM_ALREADY_EXISTS))
					return
				}
			}
			next(error)
		}
	},

	router.get('/hotels', async (req, res, next) => {
		const { success, data: searchQueryData } =
			searchHotelsQuerySchema.safeParse(req.query)

		if (!success) {
			res.status(400).json(errorResponse(ErrorCodes.INVALID_REQUEST))
			return
		}
		try {
			const { city, country, minRating, maxPrice, minPrice } = searchQueryData

			const hotels = await prisma.$queryRaw<HotelSearchResult[]>`
      SELECT 
        h.id,
        h.name,
        h.description,
        h.city,
        h.country,
        h.amenities,
        h.rating,
        h."totalReviews",
        MIN(r."pricePerNight")::float as "minPricePerNight"
      FROM hotels h
      INNER JOIN rooms r ON h.id = r."hotelId"
      WHERE 1=1
        ${city ? Prisma.sql`AND LOWER(h.city) = LOWER(${city})` : Prisma.empty}
        ${country ? Prisma.sql`AND LOWER(h.country) = LOWER(${country})` : Prisma.empty}
        ${minRating ? Prisma.sql`AND h.rating >= ${minRating}::decimal` : Prisma.empty}
      GROUP BY h.id, h.name, h.description, h.city, h.country, h.amenities, h.rating, h."totalReviews"
      HAVING 1=1
        ${minPrice ? Prisma.sql`AND MIN(r."pricePerNight") >= ${minPrice}::decimal` : Prisma.empty}
        ${maxPrice ? Prisma.sql`AND MIN(r."pricePerNight") <= ${maxPrice}::decimal` : Prisma.empty}
      ORDER BY h.rating DESC, "minPricePerNight" ASC
    `
			res.status(200).json(successResponse(hotels))
		} catch (error) {
			next(error)
		}
	}),
)

router.get('/hotels/:hotelId', async (req, res, next) => {
	const hotelId = req.params.hotelId as string
	try {
		const hotel = await prisma.hotels.findUnique({
			where: { id: hotelId },
			include: {
				rooms: {
					omit: {
						hotelId: true,
						created_at: true,
						updated_at: true,
					},
				},
			},
			omit: { created_at: true, updated_at: true },
		})
		if (!hotel) {
			res.status(404).json(errorResponse(ErrorCodes.HOTEL_NOT_FOUND))
			return
		}
		res.status(200).json(successResponse(hotel))
	} catch (error) {
		next(error)
	}
})

export { router as hotelRouter }
