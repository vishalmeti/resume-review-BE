const pdfParse = require('pdf-parse');

async function extractTextFromPdf(buffer) {
  try {
    if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
      return '';
    }
    const data = await pdfParse(buffer);
    return (data && typeof data.text === 'string') ? data.text : '';
  } catch (err) {
    console.error('extractTextFromPdf error:', err);
    return '';
  }
}

module.exports = { extractTextFromPdf };


