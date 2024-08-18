import OpenAI from 'openai/index.mjs'
import dotenv from 'dotenv'
import { createWorker } from 'tesseract.js'
import sharp from 'sharp'
import fs from 'fs'

dotenv.config()

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

async function preprocessImage(imageBuffer) {
  const processedImage = await sharp(imageBuffer)
    .resize({ width: 2000 })
    .grayscale()
    .normalize()
    .toBuffer()
  return processedImage
}

export async function readAttachments(documents) {
  const worker = await createWorker("por+eng")
  await worker.load()
  await worker.loadLanguage('por+eng')
 

  const extractedTexts = []

  for (const doc of documents) {
    try {
      // const imageBuffer = fs.readFileSync(doc)
      // const preprocessedImage = await preprocessImage(imageBuffer)
      const {
        data: { text },
      } = await worker.recognize(doc)
      extractedTexts.push(text)
    } catch (error) {
      console.error(`Error processing document ${doc}:`, error)
    }
  }

  const documentsData = await Promise.all(
    extractedTexts.map(async (text) => {
      const response = await openai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `
You are an expert in extracting and formatting data from Driver's Licenses. I will provide you with OCR text from a document. Your task is to determine if it is a Brazilian Driver's License (CNH) or an American Driver's License and extract the relevant details.

For a Brazilian Driver's License (CNH), extract and format the following:
- **Name**: Look for full name keywords.
- **DOB**: Look for 'DATA NASCIMENTO' or similar and format as MM/DD/YYYY.
- **CNH Number**: Look for 'REGISTRO' or similar with 9 digits.
- **Issue Date**: Look for 'DATA 1 CNH' or similar and format as MM/DD/YYYY.

For an American Driver's License, extract and format the following:
- **Name**: Look for the full name.
- **DOB**: Look for 'DATE OF BIRTH (DOB)' and format as MM/DD/YYYY.
- **Driver Number**: Look for 'DRIVER NUMBER' or similar with a number.
- **Issue Date**: Look for 'ISS' or 'ISSUE DATE' and format as MM/DD/YYYY.

OCR Text:
${text}

`,
          },
        ],
        model: 'gpt-3.5-turbo',
      })

      return response.choices[0].message.content
    }),
  )

  await worker.terminate()
  return documentsData
}

export async function mixingDescriptionWithTemplate(
  oldDescription,
  documentsInfoArray,
) {
  console.log(documentsInfoArray)
  const fillingTheTemplate = await openai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: `
This is a Trello card description that helps me fill in the fields for my car insurance policy.
I need to organize my information here, so take this information: ${oldDescription}, and format it in this template.

First, list each client separately. Client names are separated by a hyphen ("-"):
For each client:
CLIENTE: [NAME]
DRIVER NUMBER: [DRIVER NUMBER] (if not provided, leave blank)
DOB: 
DATA DA 1ª CNH: 
DATA DA 1ª DRIVER: 

Then, list each vehicle separately:
For each vehicle:
VEICULO: 
VIN: [VIN NUMBER]
FINANCIADO or QUITADO (indicate status)

After listing all clients and vehicles, include shared information:
ENDEREÇO: 
E-MAIL: 
SENHA: cnh12345678
TELEFONE: 
SOBRENOME PROGRESSIVE: 
SOBRENOME GEICO: 

Remember:
- First list all clients, second list all vehicles and third list the restant of the template.
- EVERY CLIENT WILL SHARE THE SAME ADDRESS, EMAIL, SOBRENOME PROGRESSIVE AND SOBRENOME GEICO.
- If there are more than one client, split the names using the hyphen ("-") and create a template for each client containing the fields: CLIENTE, DRIVER, CNH, DOB, DATA DA 1ª CNH, DATA DA 1ª DRIVER.
- If there are more than one vehicle, create a template for each vehicle containing the fields: VEICULO, VIN, FINANCIADO or QUITADO.
- The information is in Portuguese. So, if the word "quitado" appears, change the status from "FINANCIADO" to "QUITADO".
- Fields not specified, leave a blank space.
- CONVERT ALL DATES TO THE FORMAT MM/DD/YYYY
- Ensure that all clients and vehicles are listed separately before listing shared information.

`,
      },
    ],
    model: 'gpt-3.5-turbo',
  })

  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: `Você é um especialista em backoffice de seguros automotivos. Sua tarefa é preencher o template fornecido com as informações extraídas dos documentos dos clientes. Mantenha a estrutura do template intacta e apenas adicione as informações necessárias nos campos apropriados.

Template a ser preenchido: ${fillingTheTemplate.choices[0].message.content}
Dados extraídos dos documentos: ${documentsInfoArray}

- Apenas mude algo do template, caso o nome extraído do documento seja igual ao nome já contido no template.
- Preencha os campos com as informações apropriadas.
- Não altere a estrutura do template. Apenas adicione as informações nos campos correspondentes.
- Deixe os campos não fornecidos vazios.
- Lembre-se que isso irá preencher um quadro Trello, então mantenha a formatação padrão, sem markdown
- Apresente o texto de forma direta, sem adicionar bullet points, listas ou formatação extra.
- Remova qualquer marcação ou formatação adicional que possa transformar o texto em listas ou alterar a formatação ao ser adicionado a um card do Trello.
- Garanta que o texto seja tratado como texto simples, sem qualquer formatação de lista ou Markdown.
- Remove todos os '-' antes de qualquer informação na resposta final
`,
      },
    ],
    model: 'gpt-3.5-turbo',
  })

  return completion.choices[0].message.content
}
