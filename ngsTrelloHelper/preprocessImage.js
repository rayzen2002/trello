import sharp from 'sharp'
import fs from 'fs'

export async function preprocessImage(imageBuffer, outputPath) {
  try {
    // Obter metadados da imagem para ajustes dinâmicos
    const metadata = await sharp(imageBuffer).metadata()

    // Configurar parâmetros de processamento baseados em metadados
    const compressionOptions =
      metadata.format === 'jpeg' ? { quality: 70 } : { compressionLevel: 9 }

    // Processar a imagem com sharp
    const processedImageBuffer = await sharp(imageBuffer)
      .resize({ width: 2000 }) // Redimensionar a imagem
      .greyscale() // Converter para escala de cinza
      .normalize() // Normalizar a imagem
      .png({ compressionLevel: 9 })
      .toFormat(metadata.format, compressionOptions) // Aplicar compressão dinâmica com base no formato
      .toBuffer()

    // Salvar a imagem preprocessada
    fs.writeFileSync(outputPath, processedImageBuffer)
    return processedImageBuffer
  } catch (error) {
    console.error('Erro ao preprocessar a imagem:', error)
  }
}

//
