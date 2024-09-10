import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import {
  mixingDescriptionWithTemplate,
  readAttachments,
  templateCard,
} from './openai.js'
// import { logPerformance } from '../src/routes/edit-card.js'
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
export async function descriptionOnTemplate(id) {
  try {
    const description = await getCardDesc(id)
    if (!description) {
      throw new Error('Card inexistente')
    }
    const middleDescription = await templateCard(description)
    return `${description} \n\n---\n\n${middleDescription}`
    // await editCard(id, `${description} \n\n---\n\n${middleDescription}`)
  } catch (error) {
    console.error('Erro no processo principal', error)
  }
}

export async function extractInfoFromDocs(id) {
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

    await preprocessImage(imageBuffer, outputPath)

    // Ler a imagem preprocessada
    const processedImageBuffer = fs.readFileSync(outputPath)
    processedImages.push(processedImageBuffer)
  }
  const documentsInfo = await readAttachments(processedImages)
  if (!documentsInfo) {
    throw new Error('Falha ao extrair informações do documento')
  }

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
  return documentsInfo
}

export async function editingCard(id, description, documentsInfo) {
  const oldDescription = await getCardDesc(id)
  const newDescription = await mixingDescriptionWithTemplate(
    description,
    documentsInfo,
  )

  if (!newDescription) {
    throw new Error('Falha ao gerar nova descrição')
  }
  await editCard(id, `${oldDescription} \n\n---\n\n${newDescription}`)
}
