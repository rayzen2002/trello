import fastify from 'fastify'
import { editCard } from './routes/edit-card.js'
import fastifyCors from '@fastify/cors'
import fastifyServerTimeout from 'fastify-server-timeout'

export const app = fastify()
app.register(fastifyCors, {
  origin: 'https://ngs-eight.vercel.app',
})

app.register(fastifyServerTimeout, {
  timeout: 360000, // 6 minutos
  onTimeout: (req, reply) => {
    reply.send({ error: 'Request timed out' })
  },
})

app.register(editCard)
app.get('/', () => {
  return 'hello world'
})
