import { Hono } from 'hono'
import { handle } from 'hono/vercel'

const app = new Hono()

app.get('/health', (c) => c.json({ status: 'ok', timestamp: Date.now() }))

export default handle(app)
