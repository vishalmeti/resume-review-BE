const mongoose = require('mongoose');

const PlanItemSchema = new mongoose.Schema(
  {
    title: String,
    description: String,
    durationWeeks: Number,
    resources: [String],
    status: { type: String, enum: ['Planned', 'In Progress', 'Done'], default: 'Planned' },
  },
  { _id: false }
);

const LearningPlanSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    resumeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resume' },
    role: String,
    items: [PlanItemSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('LearningPlan', LearningPlanSchema);


