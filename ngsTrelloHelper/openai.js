import OpenAI from 'openai/index.mjs'
import dotenv from 'dotenv'

dotenv.config()

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
// OCR => Recebe os documentos e extrai os dados e passa pela IA para organizar em uma lista de dados do cliente
export async function readAttachments(extractedTexts, batchSize = 10) {
  const processBatch = async (batch) => {
    const processedData = await Promise.all(
      batch.map(async (text) => {
        try {
          const response = await openai.chat.completions.create({
            messages: [
              {
                role: 'system',
                content: `
                    You are an expert in extracting data from driver's license documents, primarily from Massachusetts, New Jersey, Connecticut, Florida, and Brazil. Your task is to analyze the document image and accurately extract the following information:
                    - Full Name (FIRST NAME THEN LASTNAME)
                    - Date of Birth (DOB)
                    - Date of issuance of the 1st Driver License (either American or foreign)
                    - Driver License Number (Driver Number)

                    ### Specific Instructions:

                    1. **Document Types**:
                      - Disregard any document that is not a driver's license.
                      - If the client presents both an American and a foreign license, only consider the American license.
                      - If the client does not present an American license, consider the foreign one.

                    2. **Multiple Clients**:
                      - The prompt should be able to differentiate between documents from more than one client and organize the information separately for each.
                      - Group the licenses for each client based on the full name and date of birth.
                      - Always prioritize the American driver's license if available for each client.

                    3. **Document Details**:
                      - **American Licenses** (Massachusetts, New Jersey, Connecticut, Florida):
                        - Look for fields labeled **DL**, **Driver's License Number**, **License Number**, or similar.
                        - The state of issuance will be indicated in fields such as **STATE**, **ISSUED IN**, or similar.
                        - The date of issuance may be labeled **ISS**, **DATE OF ISSUE**, or similar.
                        - If it is a New Jersey drivers license, ignore the name lothrice the floid or similar, this is the signature on the driver and not the name from the client.

                      - **Brazilian Licenses (CNH)**:
                        - The document number will be in a field labeled **Registro** or similar.
                        - The date of issuance of the first CNH will be found in the field **Data da 1ª CNH** or **Emissão**.
                        - Dates should be formatted as DD/MM/YYYY, but convert to MM/DD/YYYY for output.

                      - **Date of Birth (DOB)**:
                        - Look for fields labeled **Data de Nascimento**, **DOB**, **Birth Date**, or similar.
                        - Ensure proper format conversion from DD/MM/YYYY to MM/DD/YYYY.

                    4. **Output Format**:
                      - For each client, the data should be separated. Example:
                        ***

                        CLIENTE: [FULL NAME OF CLIENT A]
                        DOB: [DATE OF BIRTH OF CLIENT A]
                        DRIVER NUMBER: [DRIVER NUMBER OF CLIENT A]
                        DATA DA 1ª DRIVER: [DATE OF ISSUANCE OF DRIVER LICENSE OF CLIENT A]

                        CLIENTE: [FULL NAME OF CLIENT B]
                        DOB: [DATE OF BIRTH OF CLIENT B]
                        DRIVER NUMBER: [DRIVER NUMBER OF CLIENT B]
                        DATA DA 1ª DRIVER: [DATE OF ISSUANCE OF DRIVER LICENSE OF CLIENT B]

                        ***

                      - If the client only has a foreign driver's license, format it as follows:
                        ***

                        CLIENTE: [FULL NAME OF CLIENT]
                        DOB: [DATE OF BIRTH OF CLIENT]
                        DRIVER NUMBER: [DOCUMENT NUMBER OF CLIENT]

                        ***

                    5. **Formatting**:
                      - All text must be converted to uppercase.
                      - Dates must be formatted as MM/DD/YYYY.
                      - Avoid repetitions or irrelevant information at the end of the text.
                    `,
              },
              {
                role: 'user',
                content: `OCR Text:\n${text}`,
              },
            ],
            model: 'gpt-3.5-turbo', // Or 'gpt-4' if you have access
          })
          return response.choices[0].message.content
        } catch (error) {
          console.error('Error processing text with OpenAI:', error)
          return ''
        }
      }),
    )
    return processedData
  }

  const results = []
  for (let i = 0; i < extractedTexts.length; i += batchSize) {
    const batch = extractedTexts.slice(i, i + batchSize)
    results.push(processBatch(batch))
  }

  const allResults = await Promise.all(results)

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
        content: `
          You are an expert in automotive insurance back-office operations. Your task is to accurately fill in the provided template with the information extracted from the client's documents. Ensure that the structure of the template remains intact and only insert the necessary details into the appropriate fields.

          Template to be completed: ${description}
          Extracted data: ${JSON.stringify(documentsInfoArray)}

          - Only complete the fields related to 'DOB', 'DATA DA 1ª DRIVER', 'DRIVER NUMBER', and 'VEÍCULO'.
          - Ensure that the template is filled for all clients listed. If there are multiple clients, each client should be listed separately.
          - For each client, the 'E-MAIL' field should be left blank and the 'SENHA' field should always be filled with the default value: cnh12345678.
          - **Match the client's name**: When filling in the client's information, if the name on the template is not an exact match, fill in the closest match found in the template.
          - Ensure that the text is treated as plain text, without any list formatting or Markdown.

          ### EXAMPLE TO FOLLOW:

          **Input:**
          CLIENTE: ALICE SMITH - BOB JOHNSON
          ENDEREÇO: 123 MAIN ST
          VIN: 1HGBH41JXMN109186 - FINANCIADO
          VIN: 1HGBH41JXMN109187 - QUITADO

          **Output:**
          CLIENTE: ALICE SMITH
          DOB: 01/01/1980
          DRIVER NUMBER: 123456789
          DATA DA 1ª DRIVER: 05/15/2005

          CLIENTE: BOB JOHNSON
          DOB: 02/02/1975
          DRIVER NUMBER: 987654321
          DATA DA 1ª DRIVER: 06/20/2010

          ENDEREÇO: 123 MAIN ST

          VEÍCULO: 2012 HONDA CIVIC
          VIN: 1HGBH41JXMN109186
          FINANCIADO

          VEÍCULO: 2013 HONDA CIVIC
          VIN: 1HGBH41JXMN109187
          QUITADO

          E-MAIL:
          SENHA: cnh12345678
          TELEFONE:
          SOBRENOME PROGRESSIVE:
          SOBRENOME GEICO:

          ### REMINDERS:
          - Identify the car model based on the provided VIN and fill in the VEÍCULO field with the format: Year - Name of the Vehicle (e.g., 2012 - Honda Civic).
          - Ensure that each client and vehicle is listed separately, and shared information comes after all client-specific details.
          - Remove all formatting and make sure everything is in uppercase except for the password, which should remain as is.
          - Ensure that the 'DRIVER NUMBER' is included for each client.
          - If there are multiple clients, each client should be listed with their respective details.
        `,
      },
    ],
    model: 'gpt-3.5-turbo',
  })

  return completion.choices[0].message.content
}
