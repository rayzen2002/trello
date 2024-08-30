import { z } from 'zod'
import { descriptionOnTemplate } from '../../ngsTrelloHelper/trello.js'
import { getCardDesc } from '../../ngsTrelloHelper/helpers/get-card-description.js'
// import { performance } from 'perf_hooks'

// function logMemoryUsage() {
//   const memoryUsage = process.memoryUsage()
//   console.log('Memory Usage:', {
//     rss: memoryUsage.rss / 1024 / 1024, // Resident Set Size
//     heapTotal: memoryUsage.heapTotal / 1024 / 1024,
//     heapUsed: memoryUsage.heapUsed / 1024 / 1024,
//     external: memoryUsage.external / 1024 / 1024,
//   })
// }

// export function logPerformance() {
//   const memoryUsage = process.memoryUsage()
//   console.log('Memory Usage:', {
//     rss: memoryUsage.rss / 1024 / 1024,
//     heapTotal: memoryUsage.heapTotal / 1024 / 1024,
//     heapUsed: memoryUsage.heapUsed / 1024 / 1024,
//     external: memoryUsage.external / 1024 / 1024,
//   })

// const now = performance.now()
// console.log('Current Performance Time:', now)
// }
export async function editCard(server) {
  server.post('/edit', async (req, res) => {
    const cardSchema = z.object({
      id: z
        .string()
        .min(1, 'ID do card não pode estar vazio')
        .regex(/^[a-zA-Z0-9]+$/, 'ID do card inválido'),
    })

    // logMemoryUsage() // Log inicial para comparação

    try {
      const card = cardSchema.parse(req.body)

      // Verifica se o ID do card é válido e se o card existe
      const description = await getCardDesc(card.id)
      if (!description) {
        return res.status(404).send({ message: 'Card não encontrado' }) // Erro 404 para card não existente
      }

      // Se o card existe, continua o processamento
      await descriptionOnTemplate(card.id)
      res.status(200).send({ message: 'Card alterado com sucesso' })
    } catch (error) {
      console.error('Erro ao tentar alterar o card:', error)

      if (error instanceof z.ZodError) {
        // Erros de validação
        res
          .status(400)
          .send({ message: 'Erro de validação', errors: error.errors })
      } else if (error.message === 'Card inexistente') {
        res.status(404).send({ message: 'Card não encontrado' })
      } else {
        // Outros erros
        res
          .status(500)
          .send({ message: 'Erro ao alterar o card', error: error.message })
      }
    }
  })
}
