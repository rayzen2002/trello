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
                             You are an expert in extracting data from driver's license documents. 
                             Your task is to analyze the OCR text and accurately extract the following information:
                            - Full Name
                            - Date of Birth (DOB)
                            - Date of issuance of the first driver's license (DATA DA 1ª CNH for Brazilian licenses)
                            - Date of issuance of the first U.S. driver's license (DATA DA 1ª DRIVER)

                            Key details to consider:
                            - Identify the type of document (American driver's license or a foreign license, primarily Brazilian CNH).
                            - For U.S. driver's licenses, specify the state the document is from. The most common states will be Massachusetts, New Jersey, and Connecticut.
                            - Group all licenses presented by the same person based on the extracted name and other identifying details. For example, if the person named "Fulano Beltrano" submits two documents—a Massachusetts driver's license and a Brazilian CNH—consolidate the information into a single entry as shown below:

                            Example Output:
                            Name: Fulano Beltrano
                            DOB: [Date of Birth]
                            DATA DA 1ª CNH: [Date of issuance of the Brazilian CNH]
                            DATA DA 1ª DRIVER: [Date of issuance of the U.S. driver's license, usually found in a field labeled ISS]

                            Instructions:
                            - Ensure that the document type and the corresponding country/state are clearly identified.
                            - Format the extracted information in plain text, with no list or Markdown formatting.
                            - Remove any hyphens ('-') before presenting the final information.
                            - Convert all text to uppercase.
                            - Ensure that dates are formatted as MM/DD/YYYY.
                            - Review all information and avoid repeating details at the end.

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
            DATA DA 1ª CNH: 
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

        ### REMINDERS:
        - Identify the car model based on the provided VIN, and then fill in the VEÍCULO field with the format: Year - Name of the Vehicle (e.g., 2008 - Dodge Ram 1500). Make sure the year and the model name are correctly matched to the VIN.
        - **Ensure that all clients and vehicles are listed separately before listing shared information.**
        - **Put everything to uppercase.** Capitalize everything except the password, always keep it as cnh12345678.
        - If there are more than one vehicle, create a separate entry for each vehicle containing the fields: VEICULO, VIN, FINANCIADO or QUITADO.
        - The information is in Portuguese. If the word "quitado" appears, change the status from "FINANCIADO" to "QUITADO".
        - Remove all "-" characters from the beginning of each line.

        ### EXAMPLE TO FOLLOW:
        **Input:**
        ciclano exemplo - emanuel magalhaes martins - fulano belatrano
        rua monsenhor furtado 591
        VIN: 19XFB2F52EE252480 FINANCIADO - 19XFB2F52EE252480 FINANCIADO - 19XFB2F52EE252480 QUITADO - 19XFB2F52EE252480 FINANCIADO

        **Output:**
        CLIENTE: CICLANO EXEMPLO
        DRIVER:
        DOB: 
        DATA DA 1ª CNH:
        DATA DA 1ª DRIVER: NÃO TEM

        CLIENTE: EMANUEL MAGALHAES MARTINS
        DRIVER:
        DOB: 
        DATA DA 1ª CNH:
        DATA DA 1ª DRIVER: NÃO TEM

        CLIENTE: FULANO BELATRANO
        DRIVER:
        DOB: 
        DATA DA 1ª CNH:
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
        Your task is to accurately fill in the provided template with the information 
        extracted from the client's documents. Ensure that the structure of the template 
        remains intact and only insert the necessary details into the appropriate fields.

          Template to be completed: ${description}
          Extracted data: ${documentsInfoArray}

      - Only complete the fields related to 'DOB', 'DATA DA 1ª CNH' and ' DATA DA 1ª DRIVER'.
      - The field 'DATA DA 1ª CNH' should only be filled if a document other than a U.S. driver's license is provided, such as a Brazilian CNH.
      - The 'DRIVER NUMBER' field should prioritize the number from a U.S. driver's license. If no U.S. driver's license is presented and only a foreign document is provided, this field should be filled with that number.
      - Do not alter the template's structure. Only add the information to the corresponding fields.
      - Ensure that the text is treated as plain text, without any list formatting or Markdown.
      - Remove all hyphens ('-') before any information in the final response.
      - Review the entire document to remove any possible formatting that may have been added during the process, and convert all content to uppercase.
      - Fill in the dates in the template in the MM/DD/YYYY format.
      -  Specify the country and state to which the document belongs in the DRIVER NUMBER field as follows: NUMBER - COUNTRY - STATE.
      - Review the information already filled in the template and avoid repeating information at the end.

`,
      },
    ],
    model: 'gpt-3.5-turbo',
  })

  return completion.choices[0].message.content
}
