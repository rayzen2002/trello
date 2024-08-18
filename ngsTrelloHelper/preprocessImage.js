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
  const canvas = createCanvas(image.bitmap.width, image.bitmap.height)
  const ctx = canvas.getContext('2d')
  const img = await loadImage(processedBuffer)

  ctx.drawImage(img, 0, 0)
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

  // Carregar a imagem no OpenCV
  const src = cv.matFromImageData(imageData)
  const dst = new cv.Mat()

  // Aplicar binarização (thresholding)
  cv.threshold(src, dst, 128, 255, cv.THRESH_BINARY)

  // Converter a imagem processada de volta para Jimp
  const data = Buffer.from(dst.data)
  const processedImage = new Jimp({
    width: dst.cols,
    height: dst.rows,
    data,
  })

  // Salvar a imagem preprocessada
  await processedImage.writeAsync(outputPath)

  // Liberar a memória
  src.delete()
  dst.delete()

  return processedBuffer
}
