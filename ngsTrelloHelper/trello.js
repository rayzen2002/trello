import fs from 'fs'
import fetch from 'node-fetch'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { mixingDescriptionWithTemplate, readAttachments } from './openai.js'
import { preprocessImage } from './preprocessImage.js'

dotenv.config()

const signature = `${process.env.secret}&${process.env.token}`
const timestamp = Math.floor(Date.now() / 1000)
const nonce = Math.random().toString(36).substring(2) + Date.now().toString(36)
const id = 'dbBwzQ00'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const downloadsDir = path.join(__dirname, 'downloads')
const preprocessedDir = path.join(__dirname, 'preprocessed')

if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir)
}

if (!fs.existsSync(preprocessedDir)) {
  fs.mkdirSync(preprocessedDir)
}

async function getCardDesc(id) {
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

async function editCard(cardId, description) {
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

async function getAttachments(cardId) {
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

async function downloadAttachment(url, filename) {
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

async function downloadAllAttachments(cardId) {
  try {
    const attachments = await getAttachments(cardId)
    if (attachments && attachments.length > 0) {
      for (const attachment of attachments) {
        const url = attachment.url
        const filename = attachment.name
        await downloadAttachment(url, filename)
      }
    } else {
      console.log('Nenhum anexo encontrado.')
    }
  } catch (error) {
    console.error('Erro ao baixar todos os anexos', error)
  }
}

export async function main() {
  try {
    const description = await getCardDesc(id)
    await downloadAllAttachments(id)

    const imageFiles = fs.readdirSync(downloadsDir).filter((file) => {
      return (
        file.endsWith('.png') ||
        file.endsWith('.jpg') ||
        file.endsWith('.jpeg') ||
        file.endsWith('.pdf')
      )
    })

    if (imageFiles.length === 0) {
      console.log(`No images found in the directory: ${downloadsDir}`)
      throw new Error(`No images found in the directory: ${downloadsDir}`)
    }
    const processedImages = []

    for (const file of imageFiles) {
      const imagePath = path.join(downloadsDir, file)
      const imageBuffer = fs.readFileSync(imagePath)
      const outputPath = path.join(preprocessedDir, `preprocessed_${file}`)

      // Preprocessar a imagem
      await preprocessImage(imageBuffer, outputPath)

      // Ler a imagem preprocessada
      const processedImageBuffer = fs.readFileSync(outputPath)
      processedImages.push(processedImageBuffer)
    }

    const documentsInfo = await readAttachments(processedImages)

    if (!documentsInfo) {
      throw new Error('Falha ao extrair informações do documento')
    }

    const newDescription = await mixingDescriptionWithTemplate(
      description,
      documentsInfo,
    )

    if (!newDescription) {
      throw new Error('Falha ao gerar nova descrição')
    }

    await editCard(id, `${description} \n\n---\n\n${newDescription}`)
    console.log(newDescription)
    for (const file of imageFiles) {
      const imagePath = path.join(downloadsDir, file)
      fs.unlinkSync(imagePath)
      console.log(`Deleted ${file} from ${downloadsDir}`)

      const preprocessedImagePath = path.join(
        preprocessedDir,
        `preprocessed_${file}`,
      )
      fs.unlinkSync(preprocessedImagePath)
      console.log(`Deleted preprocessed_${file} from ${preprocessedDir}`)
    }
  } catch (error) {
    console.error('Erro no processo principal', error)
  }
}

main()
