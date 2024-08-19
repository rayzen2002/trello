import { z } from 'zod'
import { main } from '../../ngsTrelloHelper/trello.js'

function logMemoryUsage() {
  const memoryUsage = process.memoryUsage()
  console.log('Memory Usage:', {
    rss: memoryUsage.rss / 1024 / 1024, // Resident Set Size
    heapTotal: memoryUsage.heapTotal / 1024 / 1024,
    heapUsed: memoryUsage.heapUsed / 1024 / 1024,
    external: memoryUsage.external / 1024 / 1024,
  })
}

export async function editCard(server) {
  server.post('/edit', async (req, res) => {
    const cardSchema = z.object({
      id: z.string(),
    })

    logMemoryUsage() // Log inicial para comparação

    try {
      const card = cardSchema.parse(req.body)
      await main(card)
      logMemoryUsage() // Log após execução principal

      res.status(200).send({ message: 'Card alterado com sucesso' })
    } catch (error) {
      logMemoryUsage() // Log em caso de erro
      console.error('Erro ao tentar alterar o card:', error)
      res
        .status(500)
        .send({ message: 'Erro ao alterar o card', error: error.message })
    }
  })
}
