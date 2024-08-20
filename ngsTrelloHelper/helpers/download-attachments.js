import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

export async function downloadAttachment(url, filename) {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  const downloadsDir = path.join(__dirname, 'downloads')
  const preprocessedDir = path.join(__dirname, 'preprocessed')
  const signature = `${process.env.secret}&${process.env.token}`
  const timestamp = Math.floor(Date.now() / 1000)
  const nonce =
    Math.random().toString(36).substring(2) + Date.now().toString(36)

  if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir)
  }

  if (!fs.existsSync(preprocessedDir)) {
    fs.mkdirSync(preprocessedDir)
  }
  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `OAuth oauth_consumer_key="${process.env.apiKey}", oauth_token="${process.env.token}", oauth_signature_method="HMAC-SHA1", oauth_timestamp="${timestamp}", oauth_nonce="${nonce}", oauth_version="1.0", oauth_signature="${signature}"`,
      },
    })
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.statusText}`)
    }
    const buffer = await response.buffer()
    const filePath = path.join(downloadsDir, filename)
    fs.writeFileSync(filePath, buffer)
    console.log(`Downloaded ${filename} to ${filePath}`)
  } catch (error) {
    console.error(`Erro ao baixar o anexo ${filename}`, error)
  }
}
