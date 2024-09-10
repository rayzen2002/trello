import fs from 'fs/promises'
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
import { preprocessImage } from './helpers/preprocessImage.js'

dotenv.config()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const downloadsDir = path.join(__dirname, 'helpers/downloads')
const preprocessedDir = path.join(__dirname, 'helpers/preprocessed')

const BATCH_SIZE = 2 // Limite o número de arquivos processados simultaneamente

export async function descriptionOnTemplate(id) {
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

    const imageFiles = (await fs.readdir(downloadsDir)).filter((file) =>
      ['.png', '.jpg', '.jpeg', '.pdf'].some((ext) => file.endsWith(ext)),
    )

    if (imageFiles.length === 0) {
      throw new Error(`No images found in the directory: ${downloadsDir}`)
    }

    const processBatch = async (files) => {
      const processedImagesPromises = files.map(async (file) => {
        const imagePath = path.join(downloadsDir, file)
        const outputPath = path.join(preprocessedDir, `preprocessed_${file}`)

        await preprocessImage(imagePath, outputPath)

        const processedImageBuffer = await fs.readFile(outputPath)
        await fs.unlink(imagePath)
        await fs.unlink(outputPath)

        return processedImageBuffer
      })

      return Promise.all(processedImagesPromises)
    }

    let processedImages = []
    for (let i = 0; i < imageFiles.length; i += BATCH_SIZE) {
      const batch = imageFiles.slice(i, i + BATCH_SIZE)
      const batchProcessedImages = await processBatch(batch)
      processedImages = processedImages.concat(batchProcessedImages)
    }

    const documentsInfo = await readAttachments(processedImages)

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

    if (!newDescription) {
      throw new Error('Falha ao gerar nova descrição')
    }

    await editCard(id, `${oldDescription} \n\n---\n\n${newDescription}`)
  } catch (error) {
    console.error('Erro ao editar o card:', error)
    throw new Error('Erro ao editar o card.')
  }
}
