import { app } from './app.js'

const port = process.env.PORT ? parseInt(process.env.PORT) : 3333

try {
  app
    .listen({
      host: '0.0.0.0',
      port,
    })
    .then(() => {
      console.log(`Server running on ${port}`)
    })
} catch (error) {
  console.log(error)
}
