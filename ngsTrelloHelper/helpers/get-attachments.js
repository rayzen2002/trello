export async function getAttachments(cardId) {
  try {
    const response = await fetch(
      `https://api.trello.com/1/cards/${cardId}/attachments?key=${process.env.apiKey}&token=${process.env.token}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      },
    )
    const data = await response.json()

    return data
  } catch (error) {
    console.error('Erro ao obter anexos', error)
  }
}
