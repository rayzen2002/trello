import { z } from 'zod'
import { descriptionOnTemplate } from '../../ngsTrelloHelper/trello.js'
import { performance } from 'perf_hooks'

function logMemoryUsage() {
  const memoryUsage = process.memoryUsage()
  console.log('Memory Usage:', {
    rss: memoryUsage.rss / 1024 / 1024, // Resident Set Size
    heapTotal: memoryUsage.heapTotal / 1024 / 1024,
    heapUsed: memoryUsage.heapUsed / 1024 / 1024,
    external: memoryUsage.external / 1024 / 1024,
  })
}

export function logPerformance() {
  const memoryUsage = process.memoryUsage()
  console.log('Memory Usage:', {
    rss: memoryUsage.rss / 1024 / 1024,
    heapTotal: memoryUsage.heapTotal / 1024 / 1024,
    heapUsed: memoryUsage.heapUsed / 1024 / 1024,
    external: memoryUsage.external / 1024 / 1024,
  })

  const now = performance.now()
  console.log('Current Performance Time:', now)
}
export async function editCard(server) {
  server.post('/edit', async (req, res) => {
    const cardSchema = z.object({
      id: z.string(),
    })

    logMemoryUsage() // Log inicial para comparação

    try {
      const card = cardSchema.parse(req.body)
      await descriptionOnTemplate(card.id)
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
