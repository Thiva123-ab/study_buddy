import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import serverModule from './dist/server/server.js'

const port = process.env.PORT || 3000
const app = new Hono()

// Serve static assets from dist/client (CSS, JS, images, etc.)
app.use('/*', serveStatic({ root: './dist/client' }))

// Pass all other requests to TanStack Start SSR
app.all('*', async (c) => {
  return serverModule.default ? serverModule.default.fetch(c.req.raw, process.env, {}) : serverModule.fetch(c.req.raw, process.env, {})
})

console.log(`Starting Node server on port ${port}...`)

serve({
  fetch: app.fetch,
  port
})
