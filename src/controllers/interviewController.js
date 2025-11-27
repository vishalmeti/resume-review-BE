const mongoose = require('mongoose');
const InterviewSession = require('../models/InterviewSession');
const Resume = require('../models/Resume');
const { extractFirstJson } = require('../utils/json');
const { getGemini } = require('../config/gemini');

exports.startSession = async (req, res) => {
  try {
    const { resumeId, role, numQuestions = 5 } = req.body;
    if (!resumeId) return res.status(400).json({ error: 'resumeId is required' });
    if (!mongoose.Types.ObjectId.isValid(resumeId)) return res.status(400).json({ error: 'Invalid resumeId' });
    const resume = await Resume.findOne({ _id: resumeId, userId: req.user._id });
    if (!resume) return res.status(404).json({ error: 'Resume not found' });

    const genai = getGemini();
    const model = genai.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = `Generate ${numQuestions} interview questions tailored to this resume and role. Return JSON as { questions: string[] } and keep questions concise.
Resume JSON: ${JSON.stringify(resume.toObject())}\nRole: ${role || ''}`;
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const json = extractFirstJson(text);
    if (!json || !Array.isArray(json.questions)) return res.status(500).json({ error: 'Failed to generate questions' });

    const session = await InterviewSession.create({ userId: req.user._id, resumeId, role, questions: json.questions });
    res.json({ sessionId: session._id, questions: json.questions, currentIndex: 0 });
  } catch (err) {
    console.error('startSession error', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.answerQuestion = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { answer } = req.body;
    const session = await InterviewSession.findOne({ _id: sessionId, userId: req.user._id });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.isCompleted) return res.status(400).json({ error: 'Session completed' });

    const question = session.questions[session.currentIndex];
    const genai = getGemini();
    const model = genai.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = `You are an interview coach. Given the question and candidate answer, provide feedback and a score 0-100. Return JSON { feedback, score }.
Question: ${question}\nAnswer: ${answer}`;
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const json = extractFirstJson(text) || { feedback: 'Thanks for your answer.', score: 50 };

    session.history.push({ question, answer, feedback: json.feedback, score: json.score });
    session.currentIndex += 1;
    if (session.currentIndex >= session.questions.length) session.isCompleted = true;
    await session.save();

    res.json({
      feedback: json.feedback,
      score: json.score,
      nextIndex: session.currentIndex,
      isCompleted: session.isCompleted,
      nextQuestion: session.isCompleted ? null : session.questions[session.currentIndex],
    });
  } catch (err) {
    console.error('answerQuestion error', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getReport = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await InterviewSession.findOne({ _id: sessionId, userId: req.user._id });
    if (!session) return res.status(404).json({ error: 'Not found' });
    
    // Aggregate a simple report
    const avgScore = session.history.length
      ? Math.round(session.history.reduce((sum, h) => sum + (h.score || 0), 0) / session.history.length)
      : 0;
    res.json({ session, avgScore });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.listSessions = async (req, res) => {
  try {
    const { resumeId } = req.query;
    const match = { userId: req.user._id };
    if (resumeId) match.resumeId = resumeId;
    const sessions = await InterviewSession.find(match)
      .sort({ createdAt: -1 })
      .select('role createdAt isCompleted currentIndex resumeId')
      .lean();
    res.json({ sessions });
  } catch (err) {
    console.error('listSessions error', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await InterviewSession.findOne({ _id: sessionId, userId: req.user._id });
    if (!session) return res.status(404).json({ error: 'Not found' });
    res.json({ session });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};


