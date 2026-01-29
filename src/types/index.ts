import { z } from 'zod'

const passwordSchema = z
	.string()
	.min(8, { message: 'Password must be at least 8 characters long.' })
	// .regex(/[A-Z]/, { message: 'Must contain at least one uppercase letter.' })
	// .regex(/[a-z]/, { message: 'Must contain at least one lowercase letter.' })
	// .regex(/[0-9]/, { message: 'Must contain at least one number.' })
	// .regex(/[!@#$%^&*()_+={}[\]|:;"'<>,.?~]/, {
	//   message: 'Must contain at least one special character.',
	// })
	.max(255, { message: 'Password must be not longer than 255 characters' })

const ROLES = z.enum(['customer', 'owner'])

export const signupSchema = z.object({
	name: z.string().min(2),
	email: z.email(),
	password: passwordSchema,
	role: ROLES.optional(),
	phone: z.string().max(20).min(10).optional(),
})

export const signinSchema = z.object({
	email: z.email(),
	password: passwordSchema,
})

export const createHotelSchema = z.object({
	name: z.string().min(2),
	description: z.string().min(10).max(1000),
	city: z.string().min(2),
	country: z.string().min(2),
	amenities: z.array(z.string()),
})

export const createRoomSchema = z.object({
	roomNumber: z.string().min(1),
	roomType: z.string().min(2),
	pricePerNight: z.number().min(0),
	maxOccupancy: z.number().min(1),
})

export const searchHotelsSchema = z
	.object({
		city: z.string().optional(),
		country: z.string().optional(),
		minPrice: z.coerce.number().positive().optional(),
		maxPrice: z.coerce.number().positive().optional(),
		minRating: z.coerce.number().min(0).max(5).optional(),
	})
	.refine(
		(data) => {
			// Ensure minPrice <= maxPrice if both provided
			if (data.minPrice && data.maxPrice) {
				return data.minPrice <= data.maxPrice
			}
			return true
		},
		{
			message: 'minPrice must be less than or equal to maxPrice',
		},
	)
export const hotelSearchResultSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().nullable(),
	city: z.string(),
	country: z.string(),
	amenities: z.array(z.string()),
	rating: z.number(),
	totalReviews: z.number(),
	minPricePerNight: z.number(),
})

export type HotelSearchResult = z.infer<typeof hotelSearchResultSchema>

export const bookingSchema = z
	.object({
		roomId: z.string(),
		checkInDate: z.string().refine((date) => !Number.isNaN(Date.parse(date)), {
			message: 'Invalid date format for checkInDate',
		}),
		checkOutDate: z.string().refine((date) => !Number.isNaN(Date.parse(date)), {
			message: 'Invalid date format for checkOutDate',
		}),
		guest: z.number().min(1),
	})
	.refine(
		(data) => {
			const checkIn = new Date(data.checkInDate)
			const checkOut = new Date(data.checkOutDate)
			return checkIn < checkOut
		},
		{
			message: 'INVALID_DATES',
		},
	)
