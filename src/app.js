import fastify from 'fastify'
import { editCard } from './routes/edit-card.js'
export const app = fastify()

app.register(editCard)
app.get('/', () => {
  return 'hello world'
})
