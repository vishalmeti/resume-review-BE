const mongoose = require('mongoose');

const ExperienceSchema = new mongoose.Schema(
  {
    company: String,
    role: String,
    startDate: String,
    endDate: String,
    bullets: [String],
  },
  { _id: false }
);

const EducationSchema = new mongoose.Schema(
  {
    institution: String,
    degree: String,
    startDate: String,
    endDate: String,
  },
  { _id: false }
);

const ProjectSchema = new mongoose.Schema(
  {
    name: String,
    description: String,
    technologies: [String],
  },
  { _id: false }
);

const ResumeSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: String,
    email: String,
    phone: String,
    summary: String,
    skills: [String],
    experience: [ExperienceSchema],
    education: [EducationSchema],
    projects: [ProjectSchema],
    rawText: String,
    filename: String,
    mimetype: String,
    fileSize: Number,
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Resume', ResumeSchema);


