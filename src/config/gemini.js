const { GoogleGenerativeAI } = require('@google/generative-ai');

function getGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');
  return new GoogleGenerativeAI(apiKey);
}

module.exports = { getGemini };


