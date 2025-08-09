const mongoose = require('mongoose');

const QAFeedbackSchema = new mongoose.Schema(
  {
    question: String,
    answer: String,
    feedback: String,
    score: Number,
  },
  { _id: false }
);

const InterviewSessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    resumeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resume' },
    role: String,
    questions: [String],
    currentIndex: { type: Number, default: 0 },
    history: [QAFeedbackSchema],
    isCompleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('InterviewSession', InterviewSessionSchema);


