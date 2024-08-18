import { z } from 'zod'
import { main } from '../../ngsTrelloHelper/trello.js'

export async function editCard(server) {
  server.post('/edit', async (req, res) => {
    const cardSchema = z.object({
      id: z.string(),
    })

    try {
      const card = cardSchema.parse(req.body)
      await main(card)
      res.status(200).send({ message: 'Card alterado com sucesso' })
    } catch (error) {
      console.error('Erro ao tentar alterar o card:', error)
      res
        .status(500)
        .send({ message: 'Erro ao alterar o card', error: error.message })
    }
  })
}
