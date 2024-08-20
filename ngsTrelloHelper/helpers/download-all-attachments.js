import { downloadAttachment } from './download-attachments.js'
import { getAttachments } from './get-attachments.js'
export async function downloadAllAttachments(cardId) {
  try {
    const attachments = await getAttachments(cardId)
    if (attachments && attachments.length > 0) {
      for (const attachment of attachments) {
        const url = attachment.url
        const filename = attachment.name
        await downloadAttachment(url, filename)
      }
    } else {
      console.log('Nenhum anexo encontrado.')
    }
  } catch (error) {
    console.error('Erro ao baixar todos os anexos', error)
  }
}
