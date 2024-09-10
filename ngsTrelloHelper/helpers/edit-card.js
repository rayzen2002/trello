import axios from 'axios'
import axiosRetry from 'axios-retry'
axiosRetry(axios, {
  retries: 5, // Número máximo de tentativas
  retryDelay: (retryCount) => {
    console.log(`Tentativa de retry: ${retryCount}`)
    return axiosRetry.exponentialDelay(retryCount)
  },
  retryCondition: (error) => {
    // Retentar apenas em erros de rede ou status 5xx
    return error.response?.status >= 500 || error.code === 'ECONNABORTED'
  },
})

export async function editCard(cardId, description) {
  const endpoint = `https://api.trello.com/1/cards/${cardId}?key=${process.env.apiKey}&token=${process.env.token}`

  try {
    const response = await axios.put(
      endpoint,
      {
        desc: description,
      },
      {
        params: {
          key: process.env.apiKey,
          token: process.env.token,
        },
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      },
    )
    if (response.status !== 200) {
      throw new Error(`Error: ${response.status} ${response.statusText}`)
    }
  } catch (error) {
    console.error('Erro ao atualizar a descrição', error)
    throw error
  }
}
