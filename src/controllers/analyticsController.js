const Resume = require('../models/Resume');
const InterviewSession = require('../models/InterviewSession');
const JobApplication = require('../models/JobApplication');
const LearningPlan = require('../models/LearningPlan');
const mongoose = require('mongoose');

// Get detailed analytics for charts and insights
exports.getAnalytics = async (req, res) => {
  try {
    const userId = req.user._id;
    const { period = '30' } = req.query; // days
    
    const periodDays = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // Get interview performance over time
    const interviewTrends = await getInterviewTrends(userId, startDate);
    
    // Get skill frequency analysis
    const skillAnalysis = await getSkillAnalysis(userId);
    
    // Get job application conversion rates
    const jobApplicationStats = await getJobApplicationStats(userId, startDate);
    
    // Get learning plan progress
    const learningProgress = await getLearningProgress(userId);
    
    // Get weekly activity
    const weeklyActivity = await getWeeklyActivity(userId, startDate);

    const analytics = {
      period: periodDays,
      interviewTrends,
      skillAnalysis,
      jobApplicationStats,
      learningProgress,
      weeklyActivity,
      insights: generateInsights({
        interviewTrends,
        skillAnalysis,
        jobApplicationStats,
        learningProgress
      })
    };

    res.json({ analytics });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to load analytics' });
  }
};

// Get interview performance trends
async function getInterviewTrends(userId, startDate) {
  const sessions = await InterviewSession.find({
    userId,
    isCompleted: true,
    updatedAt: { $gte: startDate }
  }).sort({ updatedAt: 1 });

  const trends = sessions.map(session => {
    const avgScore = session.history.length > 0
      ? session.history.reduce((sum, qa) => sum + (qa.score || 0), 0) / session.history.length
      : 0;
    
    return {
      date: session.updatedAt,
      score: Math.round(avgScore),
      questions: session.history.length,
      role: session.role || 'General'
    };
  });

  // Calculate moving average
  const movingAverage = [];
  const windowSize = 3;
  
  for (let i = 0; i < trends.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const window = trends.slice(start, i + 1);
    const avg = window.reduce((sum, item) => sum + item.score, 0) / window.length;
    movingAverage.push({
      date: trends[i].date,
      score: Math.round(avg)
    });
  }

  return {
    raw: trends,
    movingAverage,
    latest: trends[trends.length - 1] || null,
    improvement: trends.length >= 2 
      ? trends[trends.length - 1].score - trends[0].score
      : 0
  };
}

// Analyze skills across resumes and interview performance
async function getSkillAnalysis(userId) {
  const [resumes, completedInterviews] = await Promise.all([
    Resume.find({ userId }),
    InterviewSession.find({ userId, isCompleted: true })
  ]);

  // Collect all skills
  const skillFrequency = {};
  const skillPerformance = {};

  resumes.forEach(resume => {
    if (resume.skills) {
      resume.skills.forEach(skill => {
        skillFrequency[skill] = (skillFrequency[skill] || 0) + 1;
      });
    }
  });

  // Analyze skill performance in interviews
  completedInterviews.forEach(interview => {
    if (interview.role) {
      const avgScore = interview.history.reduce((sum, qa) => sum + (qa.score || 0), 0) / interview.history.length;
      
      // Simple skill matching - in production, you'd use NLP/matching algorithms
      Object.keys(skillFrequency).forEach(skill => {
        if (interview.role.toLowerCase().includes(skill.toLowerCase()) || 
            interview.questions.some(q => q.toLowerCase().includes(skill.toLowerCase()))) {
          
          if (!skillPerformance[skill]) {
            skillPerformance[skill] = { totalScore: 0, count: 0 };
          }
          skillPerformance[skill].totalScore += avgScore;
          skillPerformance[skill].count += 1;
        }
      });
    }
  });

  // Calculate average performance per skill
  Object.keys(skillPerformance).forEach(skill => {
    skillPerformance[skill].avgScore = Math.round(
      skillPerformance[skill].totalScore / skillPerformance[skill].count
    );
  });

  // Top skills by frequency and performance
  const topSkills = Object.entries(skillFrequency)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([skill, frequency]) => ({
      skill,
      frequency,
      performance: skillPerformance[skill]?.avgScore || null
    }));

  // Skills needing improvement (low performance)
  const improvementSkills = Object.entries(skillPerformance)
    .filter(([, data]) => data.avgScore < 70)
    .sort(([,a], [,b]) => a.avgScore - b.avgScore)
    .slice(0, 5)
    .map(([skill, data]) => ({
      skill,
      avgScore: data.avgScore,
      frequency: skillFrequency[skill] || 0
    }));

  return {
    topSkills,
    improvementSkills,
    totalUniqueSkills: Object.keys(skillFrequency).length,
    skillsWithPerformanceData: Object.keys(skillPerformance).length
  };
}

// Analyze job application success rates
async function getJobApplicationStats(userId, startDate) {
  const jobs = await JobApplication.find({
    userId,
    createdAt: { $gte: startDate }
  }).sort({ createdAt: 1 });

  const statusCounts = {
    Applied: 0,
    Interviewing: 0,
    Offer: 0,
    Rejected: 0,
    Accepted: 0,
    'On Hold': 0
  };

  jobs.forEach(job => {
    statusCounts[job.status] = (statusCounts[job.status] || 0) + 1;
  });

  const total = jobs.length;
  const conversionRates = {
    interviewRate: total > 0 ? Math.round((statusCounts.Interviewing + statusCounts.Offer + statusCounts.Accepted) / total * 100) : 0,
    offerRate: total > 0 ? Math.round((statusCounts.Offer + statusCounts.Accepted) / total * 100) : 0,
    acceptanceRate: statusCounts.Offer > 0 ? Math.round(statusCounts.Accepted / statusCounts.Offer * 100) : 0
  };

  // Application timeline
  const timeline = jobs.map(job => ({
    date: job.createdAt,
    company: job.company,
    title: job.title,
    status: job.status
  }));

  return {
    total,
    statusCounts,
    conversionRates,
    timeline,
    recentApplications: jobs.slice(-5)
  };
}

// Analyze learning plan progress
async function getLearningProgress(userId) {
  const plans = await LearningPlan.find({ userId }).sort({ createdAt: -1 });

  if (plans.length === 0) {
    return {
      totalPlans: 0,
      activePlans: 0,
      completionRate: 0,
      totalItems: 0,
      completedItems: 0,
      inProgressItems: 0
    };
  }

  let totalItems = 0;
  let completedItems = 0;
  let inProgressItems = 0;
  let activePlans = 0;

  plans.forEach(plan => {
    const planCompleted = plan.items.filter(item => item.status === 'Done').length;
    const planInProgress = plan.items.filter(item => item.status === 'In Progress').length;
    
    totalItems += plan.items.length;
    completedItems += planCompleted;
    inProgressItems += planInProgress;
    
    if (planInProgress > 0 || (plan.items.length > 0 && planCompleted < plan.items.length)) {
      activePlans++;
    }
  });

  const completionRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  // Latest plan details
  const latestPlan = plans[0];
  const latestPlanProgress = latestPlan ? {
    role: latestPlan.role,
    totalItems: latestPlan.items.length,
    completed: latestPlan.items.filter(item => item.status === 'Done').length,
    inProgress: latestPlan.items.filter(item => item.status === 'In Progress').length,
    createdAt: latestPlan.createdAt
  } : null;

  return {
    totalPlans: plans.length,
    activePlans,
    completionRate,
    totalItems,
    completedItems,
    inProgressItems,
    latestPlan: latestPlanProgress
  };
}

// Get weekly activity summary
async function getWeeklyActivity(userId, startDate) {
  const weekData = [];
  const now = new Date();
  
  // Get data for each week
  for (let i = 0; i < 4; i++) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - (i + 1) * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const [resumes, interviews, jobs, plans] = await Promise.all([
      Resume.countDocuments({ userId, createdAt: { $gte: weekStart, $lt: weekEnd } }),
      InterviewSession.countDocuments({ userId, createdAt: { $gte: weekStart, $lt: weekEnd } }),
      JobApplication.countDocuments({ userId, createdAt: { $gte: weekStart, $lt: weekEnd } }),
      LearningPlan.countDocuments({ userId, createdAt: { $gte: weekStart, $lt: weekEnd } })
    ]);

    weekData.unshift({
      week: `Week ${4 - i}`,
      weekStart,
      resumes,
      interviews,
      jobs,
      plans,
      total: resumes + interviews + jobs + plans
    });
  }

  return weekData;
}

// Generate insights based on analytics data
function generateInsights({ interviewTrends, skillAnalysis, jobApplicationStats, learningProgress }) {
  const insights = [];

  // Interview performance insights
  if (interviewTrends.improvement > 10) {
    insights.push({
      type: 'positive',
      category: 'Interview Performance',
      message: `Great progress! Your interview scores improved by ${interviewTrends.improvement} points.`,
      action: 'Keep practicing to maintain momentum!'
    });
  } else if (interviewTrends.improvement < -5) {
    insights.push({
      type: 'warning',
      category: 'Interview Performance',
      message: `Interview scores declined by ${Math.abs(interviewTrends.improvement)} points recently.`,
      action: 'Consider reviewing feedback and practicing more challenging questions.'
    });
  }

  // Skill analysis insights
  if (skillAnalysis.improvementSkills.length > 0) {
    insights.push({
      type: 'info',
      category: 'Skill Development',
      message: `${skillAnalysis.improvementSkills.length} skills need attention based on interview performance.`,
      action: `Focus on: ${skillAnalysis.improvementSkills.slice(0, 3).map(s => s.skill).join(', ')}`
    });
  }

  // Job application insights
  if (jobApplicationStats.conversionRates.interviewRate < 20 && jobApplicationStats.total >= 10) {
    insights.push({
      type: 'warning',
      category: 'Job Applications',
      message: `Low interview rate (${jobApplicationStats.conversionRates.interviewRate}%) from applications.`,
      action: 'Consider improving resume or targeting more relevant positions.'
    });
  } else if (jobApplicationStats.conversionRates.offerRate > 30) {
    insights.push({
      type: 'positive',
      category: 'Job Applications',
      message: `Excellent offer rate (${jobApplicationStats.conversionRates.offerRate}%)! You\'re targeting the right roles.`,
      action: 'Keep applying to similar positions.'
    });
  }

  // Learning progress insights
  if (learningProgress.completionRate < 30 && learningProgress.totalItems > 5) {
    insights.push({
      type: 'info',
      category: 'Learning Progress',
      message: `Learning plan completion is at ${learningProgress.completionRate}%.`,
      action: 'Try to complete at least one learning item this week.'
    });
  } else if (learningProgress.completionRate > 80) {
    insights.push({
      type: 'positive',
      category: 'Learning Progress',
      message: `Outstanding learning progress! ${learningProgress.completionRate}% completion rate.`,
      action: 'Consider creating a new learning plan for advanced skills.'
    });
  }

  return insights;
}

module.exports = exports;
