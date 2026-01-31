import express from 'express'
import { authMiddleware } from '@/middleware/auth-middleware'
import { errorMiddleware } from '@/middleware/error-middleware'
import { authRouter } from '@/routers/auth-router'
import { bookingRouter } from '@/routers/booking-router'
import { hotelRouter } from '@/routers/hotel-router'
import { reviewRouter } from '@/routers/review-router'

const app = express()
app.use(express.json())

const PORT = process.env.PORT

const routers = [authRouter, hotelRouter, bookingRouter, reviewRouter]

app.use((req, res, next) => {
	const start = process.hrtime.bigint()

	res.on('finish', () => {
		const end = process.hrtime.bigint()
		const latencyMs = Number(end - start) / 1_000_000
		console.log(`${req.method} ${req.originalUrl} → ${latencyMs.toFixed(2)} ms`)
	})

	next()
})

app.get('/health', (_req, res) => {
	res.json({
		status: 'OK',
	})
})

routers.forEach((router) => {
	if (router !== authRouter) {
		app.use('/api', authMiddleware, router)
	} else {
		app.use('/api', router)
	}
})

app.use(errorMiddleware)

app.all('{*splat}', (_req, res) => {
	res.status(404).send('Not Found')
})

app.listen(PORT, () => console.log('Server started at port', PORT))
