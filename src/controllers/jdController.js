const mongoose = require('mongoose');
const Resume = require('../models/Resume');
const { extractFirstJson } = require('../utils/json');
const { getGemini } = require('../config/gemini');

exports.matchResumeToJD = async (req, res) => {
  try {
    const { resumeId, jdText, role } = req.body;
    if (!resumeId || typeof jdText !== 'string' || jdText.trim() === '') {
      return res.status(400).json({ error: 'resumeId and non-empty jdText are required' });
    }
    if (!mongoose.Types.ObjectId.isValid(resumeId)) return res.status(400).json({ error: 'Invalid resumeId' });
    const resume = await Resume.findOne({ _id: resumeId, userId: req.user._id });
    if (!resume) return res.status(404).json({ error: 'Resume not found' });

    const genai = getGemini();
    const model = genai.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = `Given the parsed resume JSON and a job description, compute matchPercentage (0-100), matchedSkills (array), missingSkills (array), and a brief summary.
Return JSON as { matchPercentage, matchedSkills, missingSkills, summary }.

Resume JSON:\n${JSON.stringify(resume.toObject())}\n\nJD Text:\n${jdText}\n\nRole: ${role || ''}`;
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const json = extractFirstJson(text);
    if (!json) return res.status(500).json({ error: 'Failed to parse model output' });
    res.json({ ...json });
  } catch (err) {
    console.error('matchResumeToJD error', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
};


