const mongoose = require('mongoose');
const LearningPlan = require('../models/LearningPlan');
const Resume = require('../models/Resume');
const { extractFirstJson } = require('../utils/json');
const { getGemini } = require('../config/gemini');

exports.generate = async (req, res) => {
  try {
    const { resumeId, role } = req.body;
    if (!resumeId) return res.status(400).json({ error: 'resumeId is required' });
    if (!mongoose.Types.ObjectId.isValid(resumeId)) return res.status(400).json({ error: 'Invalid resumeId' });
    const resume = await Resume.findOne({ _id: resumeId, userId: req.user._id });
    if (!resume) return res.status(404).json({ error: 'Resume not found' });

    const genai = getGemini();
    const model = genai.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = `Create a practical 6-10 week learning plan to close skill gaps for the target role. Return JSON { items: [{ title, description, durationWeeks, resources: string[] }] }.
Resume JSON: ${JSON.stringify(resume.toObject())}\nRole: ${role || ''}`;
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const json = extractFirstJson(text);
    if (!json || !Array.isArray(json.items)) return res.status(500).json({ error: 'Failed to generate plan' });

    const plan = await LearningPlan.create({ userId: req.user._id, resumeId, role, items: json.items });
    res.json({ plan });
  } catch (err) {
    console.error('generate plan error', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.get = async (req, res) => {
  try {
    const { resumeId } = req.params;
    const plan = await LearningPlan.findOne({ resumeId, userId: req.user._id }).sort({ createdAt: -1 });
    if (!plan) return res.status(404).json({ error: 'Not found' });
    res.json({ plan });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { planId, index, status } = req.body;
    const plan = await LearningPlan.findOne({ _id: planId, userId: req.user._id });
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    if (!plan.items[index]) return res.status(400).json({ error: 'Invalid item index' });
    plan.items[index].status = status;
    await plan.save();
    res.json({ plan });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};


