import axios from 'axios'
import axiosRetry from 'axios-retry'

axiosRetry(axios, {
  retries: 5,
  retryDelay: (retryCount) => {
    console.log(`Tentativa de retry: ${retryCount}`)
    return axiosRetry.exponentialDelay(retryCount)
  },
  retryCondition: (error) => {
    return error.response?.status >= 500 || error.code === 'ECONNABORTED'
  },
})
export async function getCardDesc(id) {
  const endpoint = `https://api.trello.com/1/cards/${id}`
  try {
    const response = await axios.get(endpoint, {
      params: {
        key: process.env.apiKey,
        token: process.env.token,
      },
      headers: {
        Accept: 'application/json',
      },
    })
    return response.data.desc
  } catch (error) {
    console.error('Erro ao buscar descrição do card')
    throw error
  }
}
