import { serve } from '@hono/node-server'
import server from './dist/server/server.js'

const port = process.env.PORT || 3000

console.log(`Starting Node server on port ${port}...`)

serve({
  fetch: server.fetch,
  port
})
