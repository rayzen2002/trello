export async function editCard(cardId, description) {
  try {
    const response = await fetch(
      `https://api.trello.com/1/cards/${cardId}?key=${process.env.apiKey}&token=${process.env.token}`,
      {
        method: 'PUT',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          desc: description,
        }),
      },
    )
    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`)
    }
  } catch (err) {
    console.error('Erro ao atualizar a descrição', err)
  }
}
