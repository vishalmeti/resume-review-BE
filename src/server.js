const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const connectDb = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const resumeRoutes = require('./routes/resumeRoutes');
const jdRoutes = require('./routes/jdRoutes');
const interviewRoutes = require('./routes/interviewRoutes');
const learningPlanRoutes = require('./routes/learningPlanRoutes');
const jobRoutes = require('./routes/jobRoutes');

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (_, res) => {
  res.json({ status: 'ok', service: 'resume-review-be' });
});

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/jd', jdRoutes);
app.use('/api/interview', interviewRoutes);
app.use('/api/learning-plan', learningPlanRoutes);
app.use('/api/jobs', jobRoutes);

const PORT = process.env.PORT || 5000;

connectDb()
  .then(() => {
    app.listen(PORT, () => console.log(`Backend listening on port ${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });


