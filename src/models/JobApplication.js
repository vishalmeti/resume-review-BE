const mongoose = require('mongoose');

const JobApplicationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    company: { type: String, required: true },
    title: { type: String, required: true },
    status: {
      type: String,
      enum: ['Applied', 'Interviewing', 'Offer', 'Rejected', 'Accepted', 'On Hold'],
      default: 'Applied',
    },
    link: String,
    notes: String,
    followUpDate: Date,
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('JobApplication', JobApplicationSchema);


