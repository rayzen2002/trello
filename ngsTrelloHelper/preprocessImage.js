import sharp from 'sharp'
import fs from 'fs'

export async function preprocessImage(imageBuffer, outputPath) {
  console.time('preprocessImage')
  try {
    // Obter metadados da imagem para ajustes dinâmicos
    const metadata = await sharp(imageBuffer).metadata()

    // Configurar parâmetros de processamento baseados em metadados
    const compressionOptions =
      metadata.format === 'jpeg' ? { quality: 70 } : { compressionLevel: 9 }

    // Processar a imagem com sharp usando streams
    const readStream = sharp(imageBuffer)
      .resize({ width: 2000 }) // Redimensionar a imagem
      .greyscale() // Converter para escala de cinza
      .png({ compressionLevel: 9 }) // Configurar compressão para PNG
      .toFormat(metadata.format, compressionOptions) // Aplicar compressão dinâmica com base no formato

    const writeStream = fs.createWriteStream(outputPath)
    await new Promise((resolve, reject) => {
      readStream.pipe(writeStream).on('finish', resolve).on('error', reject)
    })

    console.timeEnd('preprocessImage')

    // Limpar buffer
    imageBuffer = null

    return outputPath
  } catch (error) {
    console.error('Erro ao preprocessar a imagem:', error)
    console.timeEnd('preprocessImage')
  }
}
