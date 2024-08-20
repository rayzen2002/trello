export async function getCardDesc(id) {
  try {
    const response = await fetch(
      `https://api.trello.com/1/cards/${id}?key=${process.env.apiKey}&token=${process.env.token}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      },
    )
    const data = await response.json()
    return data.desc
  } catch (error) {
    console.error(error)
  }
}
