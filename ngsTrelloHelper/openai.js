import OpenAI from 'openai/index.mjs'
import dotenv from 'dotenv'
import { createWorker } from 'tesseract.js'

dotenv.config()

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function readAttachments(documents, batchSize = 10) {
  const worker = await createWorker('por+eng')
  await worker.load()
  await worker.loadLanguage('por+eng')

  const processBatch = async (batch) => {
    const extractedTexts = await Promise.all(
      batch.map(async (doc) => {
        try {
          const {
            data: { text },
          } = await worker.recognize(doc)
          return text
        } catch (error) {
          console.error(`Erro ao processar o documento ${doc}:`, error)
          return ''
        }
      }),
    )

    const processedData = await Promise.all(
      extractedTexts.map(async (text) => {
        try {
          const response = await openai.chat.completions.create({
            messages: [
              {
                role: 'system',
                content: `
                              Você é um especialista em extração de dados de CNH. Extraia a data de nascimento, data de emissão do documento, e o número de registro do documento, identifique se é um documento Americano ou de outro país, se for Americano, diga o Estado ao qual o documento é referente e em seguida formate essas informações dos documentos. Texto OCR:
                              ${text}
                              `,
              },
            ],
            model: 'gpt-3.5-turbo',
          })
          return response.choices[0].message.content
        } catch (error) {
          console.error('Erro ao processar o texto com OpenAI:', error)
          return ''
        }
      }),
    )

    return processedData
  }

  const results = []
  for (let i = 0; i < documents.length; i += batchSize) {
    const batch = documents.slice(i, i + batchSize)
    results.push(processBatch(batch))
  }

  const allResults = await Promise.all(results)

  await worker.terminate()

  return allResults.flat()
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

- Apenas complete os campos referentes a DOB, e data da 1driver e data da 1CNH.
- O campo DATA DA 1ª CNH só deve ser preenchido caso tenha sido fornecido um documento que não seja uma driver Americana, como por exemplo, uma CNH Brasileira.
- O campo DRIVER NUMBER deve ser preenchido dando preferencia ao numéro de uma driver americana, apenas em casos onde não seja apresentado uma driver americana e apenas um documento estrangeiro, que este campo será preenchido com o numero
- Não altere a estrutura do template. Apenas adicione as informações nos campos correspondentes.
- Garanta que o texto seja tratado como texto simples, sem qualquer formatação de lista ou Markdown.
- Remove todos os '-' antes de qualquer informação na resposta final
- Revise todo o documento removendo todas as possiveis formatações que possam ter sido adicionadas no processo, transforme todo o conteúdo em letras maiúsculas.
- Preencha as datas no template no formato MM/DD/YYYY.
- Informe o pais e estado a qual pertence o documento no campo DRIVER NUMBER, da seguinte forma NUMBER - COUNTRY - STATE
- Revise as informações que já foram preenchidas no template e não repita informações no final

`,
      },
    ],
    model: 'gpt-3.5-turbo',
  })

  return completion.choices[0].message.content
}
