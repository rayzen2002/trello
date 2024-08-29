import fastify from 'fastify'
import { editCard } from './routes/edit-card.js'
import fastifyCors from '@fastify/cors'
import fastifyServerTimeout from 'fastify-server-timeout'

export const app = fastify()

app.register(fastifyServerTimeout, {
  timeout: 120000, // 2 minutos
  onTimeout: (req, reply) => {
    reply.send({ error: 'Request timed out' })
  },
})
app.register(fastifyCors, {
  origin: true,
})
app.register(editCard)
app.get('/', () => {
  return 'hello world'
})
