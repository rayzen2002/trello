import { app } from './app.js'

const port = process.env.PORT ? parseInt(process.env.PORT) : 3333

app
  .listen({
    host: '0.0.0.0',
    port,
  })
  .then(() => {
    console.log(`Server running on port ${port}`)
  })
  .catch((error) => {
    console.error('Failed to start server:', error)
  })
