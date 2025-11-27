const Resume = require('../models/Resume');
const { extractTextFromPdf } = require('../utils/parsePdf');
const { extractFirstJson } = require('../utils/json');
const { getGemini } = require('../config/gemini');

async function parseResumeWithGemini(rawText) {
  const genai = getGemini();
  const model = genai.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const prompt = `You are a resume parser. Given the resume text, extract a clean JSON with fields: name, email, phone, summary, skills (array), experience (array of {company, role, startDate, endDate, bullets}), education (array of {institution, degree, startDate, endDate}), projects (array of {name, description, technologies}).
Return ONLY JSON, no extra text.

Resume Text:\n\n${rawText}`;
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const json = extractFirstJson(text);
  if (!json) throw new Error('Failed to parse resume JSON from model output');
  return json;
}

exports.uploadAndParse = async (req, res) => {
  try {
    let rawText = '';

    const fileMeta = req.file ? {
      fieldname: req.file.fieldname,
      originalname: req.file.originalname,
      encoding: req.file.encoding,
      mimetype: req.file.mimetype,
      size: req.file.size,
    } : null;
    console.log('upload meta', fileMeta);

    if (req.file) {
      const isPdf = req.file.mimetype === 'application/pdf' || (req.file.originalname || '').toLowerCase().endsWith('.pdf');
      if (!isPdf) {
        return res.status(400).json({ error: 'Only PDF files are allowed' });
      }
      rawText = await extractTextFromPdf(req.file.buffer);
      console.log('rawText length', rawText ? rawText.length : 0);
    } else if (req.body && req.body.text) {
      rawText = String(req.body.text);
    } else {
      return res.status(400).json({ error: 'No file or text provided' });
    }

    if (!rawText || rawText.trim().length < 20) {
      return res.status(422).json({ error: 'Could not read text from PDF. Please ensure the PDF is not scanned or password-protected.' });
    }

    const parsed = await parseResumeWithGemini(rawText);
    const resume = await Resume.create({
      userId: req.user._id,
      ...parsed,
      rawText,
      filename: req.file?.originalname || null,
      mimetype: req.file?.mimetype || null,
      fileSize: req.file?.size || null,
    });
    res.json({ resume });
  } catch (err) {
    console.error('uploadAndParse error', err);
    // Normalize common multer/pdf errors
    const message =
      err.message?.includes('File too large') ? 'File too large. Max 10MB allowed.' :
      err.message?.includes('Only PDF') ? 'Only PDF files are allowed' :
      err.message || 'Failed to parse resume';
    res.status(400).json({ error: message });
  }
};

exports.getResume = async (req, res) => {
  try {
    const resume = await Resume.findOne({ 
      _id: req.params.id, 
      userId: req.user._id 
    });
    if (!resume) return res.status(404).json({ error: 'Not found' });
    res.json({ resume });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.listResumes = async (req, res) => {
  try {
    const resumes = await Resume.find(
      { userId: req.user._id }, 
      { rawText: 0 }
    ).sort({ createdAt: -1 }).lean();
    res.json({ resumes });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};


