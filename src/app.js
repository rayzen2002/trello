import fastify from 'fastify'
import { editCard } from './routes/edit-card.js'
import fastifyCors from '@fastify/cors'
export const app = fastify({
  connectionTimeout: 1000 * 60 * 2, // 2 minutos
})

app.register(fastifyCors, {
  origin: true,
})
app.register(editCard)
app.get('/', () => {
  return 'hello world'
})
