import OpenAI from 'openai/index.mjs'
import dotenv from 'dotenv'
import { createWorker } from 'tesseract.js'

dotenv.config()

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
// OCR => Recebe os documentos e extrai os dados e passa pela IA para organizar em uma lista de dados do cliente
export async function readAttachments(documents, batchSize = 10) {
  const worker = await createWorker('por+eng')

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
                    You are an expert in extracting data from driver's license documents. Your task is to analyze the OCR text and accurately extract the following information:
                    - Full Name
                    - Date of Birth (DOB)
                    - Date of issuance of the 1st Driver License (either American or foreign)
                    - Driver License Number (Driver Number)

                    ### Specific instructions:

                    1. **Document Types**:
                      - The OCR should disregard any document that is not a driver's license.
                      - If the client presents both an American and a foreign license, only consider the American license.
                      - If the client does not present an American license, consider the foreign one.

                    2. **Multiple Clients**:
                      - The prompt should be able to differentiate between documents from more than one client and organize the information separately for each.
                      - Group the licenses for each client based on the full name and date of birth.
                      - Always prioritize the American driver's license, if available, for each client.

                    3. **Looking for information in the OCR**:
                      - **American License**:
                        - The driver's license number can be identified by fields labeled **DLN**, **Lic**, **DL**, **Driver's License Number**, or similar.
                        - The state of issuance will be found in fields such as **STATE** or **ISS**.
                      - **Foreign License (mainly Brazilian CNH)**:
                        - The document number will be found in the field labeled **Registro**.
                        - The date of issuance of the first CNH will be found in the field **Data da 1ª CNH** or **Emissão**.
                      - The **Date of Birth (DOB)** will be indicated by expressions such as **Data de Nascimento**, **DOB**, **Birth Date**, or similar.

                    4. **Output Format**:
                      - For each client, the data should be separated. Example:
                        ***
                        CLIENTE: [NOME DO CLIENTE A]
                        DOB: [DATA DE NASCIMENTO DO CLIENTE A]
                        DRIVER NUMBER: [NUMERO DA DRIVER DO CLIENTE A]
                        DATA DA 1ª DRIVER: [DATA DE EMISSAO DRIVER DO CLIENTE A]

                        CLIENTE: [NOME DO CLIENTE B]
                        DOB: [DATA DE NASCIMENTO DO CLIENTE B]
                        DRIVER NUMBER: [NUMERO DA DRIVER DO CLIENTE B]
                        DATA DA 1ª DRIVER: [DATA DE EMISSAO DRIVER DO CLIENTE B]
                        ***

                      - If the client only has a foreign driver's license, format it as follows:
                      ***
                        CLIENTE: [NOME DO CLIENTE]
                        DOB: [DATA DE NASCIMENTO DO CLIENTE]
                        DRIVER NUMBER: [NUMERO DE REGISTRO DO DOCUMENTO DO CLIENTE]
                        ***

                    5. **Formatting**:
                      - All text must be converted to uppercase.
                      - Dates must be formatted as MM/DD/YYYY.
                      - Avoid repetitions or irrelevant information at the end of the text.

                    OCR Text:
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
// Primeira chamada pra criar um template inicial
export async function templateCard(description) {
  const descriptionOnTemplate = await openai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: `
        This is a Trello card description that helps me fill in the fields for my car insurance policy.
        I need to organize my information here, so take this information: ${description}, and format it in this template.

        ### INSTRUCTIONS:
        1. **List each client separately.** Client names are separated by a hyphen ("-").
        2. **For each client**, list the information in the following format:
            CLIENTE: [NAME]
            DRIVER NUMBER: 
            DOB:  
            DATA DA 1ª DRIVER: 
        3. **List each vehicle separately.** For each vehicle associated with a client, use the following format:
            VEICULO: [Year - Vehicle Name]
            VIN: [VIN NUMBER]
            [FINANCIADO or QUITADO]
        4. **Finally, list the shared information** for all clients:
            ENDEREÇO: 
            E-MAIL: 
            SENHA: cnh12345678
            TELEFONE: 
            SOBRENOME PROGRESSIVE: 
            SOBRENOME GEICO: 
        5. Remove all formatation included, the card must be with no aditional formatation, only pure text.

        ### EXAMPLE TO FOLLOW:
        **Input:**
        ciclano exemplo - emanuel magalhaes martins - fulano belatrano
        rua monsenhor furtado 591
        VIN: 19XFB2F52EE252480 FINANCIADO - 19XFB2F52EE252480 FINANCIADO - 19XFB2F52EE252480 QUITADO - 19XFB2F52EE252480 FINANCIADO

        **Output:**
        CLIENTE: CICLANO EXEMPLO
        DRIVER NUMBER:
        DOB: 
        DATA DA 1ª DRIVER: 

        CLIENTE: EMANUEL MAGALHAES MARTINS
        DRIVER NUMBER:
        DOB: 
        DATA DA 1ª DRIVER: NÃO TEM

        CLIENTE: FULANO BELATRANO
        DRIVER NUMBER:
        DOB: 
        DATA DA 1ª DRIVER: NÃO TEM

        ENDEREÇO: RUA MONSENHOR FURTADO 591

        VEICULO: 2014 HONDA CIVIC
        VIN: 19XFB2F52EE252480
        FINANCIADO

        VEICULO: 2014 HONDA CIVIC
        VIN: 19XFB2F52EE252480
        FINANCIADO

        VEICULO: 2014 HONDA CIVIC
        VIN: 19XFB2F52EE252480
        QUITADO

        VEICULO: 2014 HONDA CIVIC
        VIN: 19XFB2F52EE252480
        FINANCIADO

        E-MAIL:
        SENHA: cnh12345678
        TELEFONE:
        SOBRENOME PROGRESSIVE:
        SOBRENOME GEICO:

        ### REMINDERS:
        - Identify the car model based on the provided VIN, and then fill in the VEÍCULO field with the format: Year - Name of the Vehicle (e.g., 2008 - Dodge Ram 1500). Make sure the year and the model name are correctly matched to the VIN.
        - **Ensure that all clients and vehicles are listed separately before listing shared information.**
        - **Put everything to uppercase.** Capitalize everything except the password, always keep it as cnh12345678.
        - If there are more than one vehicle, create a separate entry for each vehicle containing the fields: VEICULO, VIN, FINANCIADO or QUITADO.
        - The information is in Portuguese. If the word "quitado" appears, change the status from "FINANCIADO" to "QUITADO".
        - Remove all "-" characters from the beginning of each line and any other caracters that may apply markdown on the text.
        - Make sure to format the address on the camp ENDERECO, and make sure everything is on uppercase. 
        `,
      },
    ],
    model: 'gpt-3.5-turbo',
  })
  return descriptionOnTemplate.choices[0].message.content
}
// Mistura os dados do OCR(pos-processados por IA) + card ja no template
export async function mixingDescriptionWithTemplate(
  description,
  documentsInfoArray,
) {
  console.log(documentsInfoArray)

  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: `You are an expert in automotive insurance back-office operations. 
                  Your task is to accurately fill in the provided template with the information extracted
                   from the client's documents. Ensure that the structure of the template remains intact and 
                   only insert the necessary details into the appropriate fields.

                  Template to be completed: ${description}
                  Extracted data: ${documentsInfoArray}

                  - Only complete the fields related to 'DOB', 'DATA DA 1ª CNH' and 'DATA DA 1ª DRIVER'.
                  - **Match the client's name**: When filling in the client's information, if the name on the template is not an exact match, fill in the closest match found in the template. 
                  - Ensure that the text is treated as plain text, without any list formatting or Markdown.
`,
      },
    ],
    model: 'gpt-3.5-turbo',
  })

  return completion.choices[0].message.content
}
