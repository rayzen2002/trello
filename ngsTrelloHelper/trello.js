import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import {
  mixingDescriptionWithTemplate,
  readAttachments,
  templateCard,
} from './openai.js'
import { editCard } from './helpers/edit-card.js'
import { getCardDesc } from './helpers/get-card-description.js'
import { downloadAllAttachments } from './helpers/download-all-attachments.js'
import { fileURLToPath } from 'url'
import vision from '@google-cloud/vision'

dotenv.config()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const downloadsDir = path.join(__dirname, 'helpers/downloads')

const client = new vision.ImageAnnotatorClient({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Corrigir a quebra de linha
  },
  projectId: process.env.GOOGLE_PROJECT_ID,
})
export async function fillTemplateWithSalesInfo(id) {
  try {
    const description = await getCardDesc(id)
    if (!description) {
      throw new Error('Card inexistente')
    }
    const middleDescription = await templateCard(description)
    return `${description} \n\n---\n\n${middleDescription}`
  } catch (error) {
    console.error('Erro no processo principal', error)
  }
}

export async function extractInfoFromDocs(id) {
  try {
    await downloadAllAttachments(id)

    const imageFiles = (await fs.promises.readdir(downloadsDir)).filter(
      (file) => ['.png', '.jpg', '.jpeg'].some((ext) => file.endsWith(ext)),
    )

    if (imageFiles.length === 0) {
      console.log(`Nenhuma imagem encontrada na pasta: ${downloadsDir}`)
      return {}
    }

    const ocrPromises = imageFiles.map(async (file) => {
      try {
        const imagePath = path.join(downloadsDir, file)
        console.log(`Processando o arquivo: ${imagePath}`) // Adiciona log
        const [result] = await client.textDetection(imagePath)
        const detections = result.textAnnotations
        console.log(
          `Texto extraído do arquivo ${file}: ${detections.length > 0 ? detections[0].description : 'Nenhum texto detectado'}`,
        ) // Adiciona log
        const extractedText =
          detections.length > 0 ? detections[0].description : ''
        await fs.promises.unlink(imagePath)
        return extractedText
      } catch (error) {
        console.error(`Erro ao processar o arquivo ${file}:`, error)
        return ''
      }
    })

    const extractedTexts = await Promise.all(ocrPromises)
    const documentsInfo = await readAttachments(extractedTexts)

    if (!documentsInfo) {
      throw new Error('Falha ao extrair informações do documento')
    }

    return documentsInfo
  } catch (error) {
    console.error('Erro ao processar documentos:', error)
    throw new Error('Erro durante o processamento dos documentos.')
  }
}

export async function editingCard(id, description, documentsInfo) {
  try {
    const [oldDescription, newDescription] = await Promise.all([
      getCardDesc(id),
      mixingDescriptionWithTemplate(description, documentsInfo),
    ])

    if (!description) {
      throw new Error('Falha ao gerar nova descrição')
    }

    await editCard(id, `${oldDescription} \n\n---\n\n${newDescription}`)
  } catch (error) {
    console.error('Erro ao editar o card:', error)
    throw new Error('Erro ao editar o card.')
  }
}
