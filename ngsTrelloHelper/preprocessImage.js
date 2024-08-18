import cv from '@techstark/opencv-js'
import Jimp from 'jimp'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { createCanvas, loadImage } from 'canvas'

// Função para processar a imagem
export async function preprocessImage(imageBuffer, outputPath) {
  // Carregar a imagem com Jimp
  const image = await Jimp.read(imageBuffer)
  image.greyscale()
  image.normalize()
  image.resize(2000, Jimp.AUTO)

  // Converter a imagem para um buffer
  const processedBuffer = await image.getBufferAsync(Jimp.MIME_PNG)

  // Criar um objeto Canvas e carregar a imagem
  const { width, height } = image.bitmap
  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d')
  const img = await loadImage(processedBuffer)

  // Desenhar a imagem no canvas
  ctx.drawImage(img, 0, 0)

  // Converter Canvas ImageData para Mat do OpenCV
  const imageData = ctx.getImageData(0, 0, width, height)
  const src = cv.matFromImageData(imageData)
  const dst = new cv.Mat()

  // Aplicar binarização (thresholding)
  cv.threshold(src, dst, 128, 255, cv.THRESH_BINARY)

  // Converter a imagem processada de volta para um buffer
  const processedImageBuffer = Buffer.from(dst.data)

  // Criar uma nova instância Jimp a partir do buffer processado
  const processedImage = new Jimp({
    width: dst.cols,
    height: dst.rows,
    data: processedImageBuffer,
  })

  // Salvar a imagem preprocessada
  await processedImage.writeAsync(outputPath)

  // Liberar a memória do OpenCV
  src.delete()
  dst.delete()

  return processedImageBuffer
}
