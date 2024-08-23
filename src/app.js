import fastify from 'fastify'
import { editCard } from './routes/edit-card.js'
export const app = fastify({
  connectionTimeout: 1000 * 60 * 2, // 2 minutos
})

app.register(editCard)
app.get('/', () => {
  return 'hello world'
})
