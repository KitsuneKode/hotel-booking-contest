import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client'
import bcrypt from 'bcryptjs'
import express from 'express'
import jwt from 'jsonwebtoken'
import { ErrorCodes, SALT_ROUNDS } from '@/constants'
import { prisma } from '@/db'
import { signinSchema, signupSchema } from '@/types'
import { errorResponse, successResponse } from '@/utils'
import config from '@/utils/config'

const router = express.Router()

router.post('/auth/signup', async (req, res, next) => {
	const { success, data: signupData } = signupSchema.safeParse(req.body)

	if (!success) {
		res.status(400).json(errorResponse(ErrorCodes.INVALID_REQUEST))
		return
	}

	try {
		const { email, name, password, phone, role } = signupData

		const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)

		const user = await prisma.users.create({
			data: {
				email,
				name,
				passwordHash,
				...(phone ? { phone } : {}),
				...(role ? { role } : {}),
			},
			omit: {
				created_at: true,
				updated_at: true,
				passwordHash: true,
			},
		})

		res.status(201).json(successResponse(user))
	} catch (error) {
		if (error instanceof PrismaClientKnownRequestError) {
			if (error.code === 'P2002') {
				res.status(400).json(errorResponse(ErrorCodes.EMAIL_ALREADY_EXISTS))
				return
			}
		}
		next(error)
	}
})

router.post('/auth/login', async (req, res, next) => {
	const { success, data: signinData } = signinSchema.safeParse(req.body)

	if (!success) {
		console.log(ErrorCodes.INVALID_REQUEST)
		res.status(400).json(errorResponse(ErrorCodes.INVALID_REQUEST))
		return
	}

	try {
		const { email, password } = signinData

		const user = await prisma.users.findUnique({
			where: {
				email,
			},
		})

		if (!user) {
			res.status(401).json(errorResponse(ErrorCodes.INVALID_CREDENTIALS))
			return
		}
		const passwordMatch = await bcrypt.compare(password, user.passwordHash)

		if (!passwordMatch) {
			res.status(401).json(errorResponse(ErrorCodes.INVALID_CREDENTIALS))
			return
		}

		const token = jwt.sign(
			{ userId: user.id, role: user.role },
			config.JWT_SECRET,
		)

		const { passwordHash, created_at, phone, ...requiredUserData } = user

		res.status(200).json(
			successResponse({
				token,
				user: requiredUserData,
			}),
		)
	} catch (error) {
		next(error)
	}
})

export { router as authRouter }
