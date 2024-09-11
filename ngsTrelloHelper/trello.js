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
import { preprocessImage } from './helpers/preprocessImage.js'

dotenv.config()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const downloadsDir = path.join(__dirname, 'helpers/downloads')
const preprocessedDir = path.join(__dirname, 'helpers/preprocessed')

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

    // Verifica se existem imagens para processar
    const imageFiles = (await fs.promises.readdir(downloadsDir)).filter(
      (file) =>
        ['.png', '.jpg', '.jpeg', '.pdf'].some((ext) => file.endsWith(ext)),
    )

    if (imageFiles.length === 0) {
      console.log(`Nenhuma imagem encontrada na pasta: ${downloadsDir}`)
      return {} // Retorna um objeto vazio se não houver imagens
    }

    // Processa imagens em paralelo
    const processedImagesPromises = imageFiles.map(async (file) => {
      const imagePath = path.join(downloadsDir, file)
      const outputPath = path.join(preprocessedDir, `preprocessed_${file}`)

      await preprocessImage(imagePath, outputPath)

      const processedImageBuffer = await fs.promises.readFile(outputPath)
      await fs.promises.unlink(imagePath)
      await fs.promises.unlink(outputPath)

      return processedImageBuffer
    })

    const processedImages = await Promise.all(processedImagesPromises)
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
    // const [oldDescription, newDescription] = await Promise.all([
    //   getCardDesc(id),
    //   mixingDescriptionWithTemplate(description, documentsInfo),
    // ])
    // const oldDescription = await getCardDesc(id)
    if (!description) {
      throw new Error('Falha ao gerar nova descrição')
    }

    await editCard(id, description)
  } catch (error) {
    console.error('Erro ao editar o card:', error)
    throw new Error('Erro ao editar o card.')
  }
}
