const Resume = require('../models/Resume');
const InterviewSession = require('../models/InterviewSession');
const JobApplication = require('../models/JobApplication');
const LearningPlan = require('../models/LearningPlan');
const mongoose = require('mongoose');

// Get comprehensive dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get all user data in parallel
    const [
      resumes,
      interviewSessions,
      jobApplications,
      learningPlans
    ] = await Promise.all([
      Resume.find({ userId }).sort({ createdAt: -1 }),
      InterviewSession.find({ userId }).sort({ createdAt: -1 }),
      JobApplication.find({ userId }).sort({ createdAt: -1 }),
      LearningPlan.find({ userId }).sort({ createdAt: -1 })
    ]);

    // Calculate interview statistics
    const completedInterviews = interviewSessions.filter(session => session.isCompleted);
    const totalQuestions = completedInterviews.reduce((total, session) => total + session.history.length, 0);
    const totalScore = completedInterviews.reduce((total, session) => {
      const sessionScore = session.history.reduce((sum, qa) => sum + (qa.score || 0), 0);
      return total + sessionScore;
    }, 0);
    const avgInterviewScore = totalQuestions > 0 ? Math.round(totalScore / totalQuestions) : 0;

    // Calculate career health score
    const careerHealthScore = calculateCareerHealthScore({
      resumes,
      interviewSessions: completedInterviews,
      jobApplications,
      learningPlans
    });

    // Get recent activity
    const recentActivity = await getRecentActivity(userId);

    // Get latest resume insights
    const latestResume = resumes[0];
    const resumeInsights = latestResume ? getResumeInsights(latestResume) : null;

    // Calculate job application stats
    const jobStats = {
      total: jobApplications.length,
      applied: jobApplications.filter(job => job.status === 'Applied').length,
      interviewing: jobApplications.filter(job => job.status === 'Interviewing').length,
      offers: jobApplications.filter(job => job.status === 'Offer').length,
      accepted: jobApplications.filter(job => job.status === 'Accepted').length
    };

    const stats = {
      careerHealthScore,
      userStats: {
        totalResumes: resumes.length,
        totalInterviews: completedInterviews.length,
        totalJobApplications: jobApplications.length,
        totalLearningPlans: learningPlans.length,
        avgInterviewScore,
        totalQuestions
      },
      jobStats,
      recentActivity,
      resumeInsights,
      // Latest match from session storage will be handled on frontend
      hasData: {
        resumes: resumes.length > 0,
        interviews: interviewSessions.length > 0,
        jobs: jobApplications.length > 0,
        plans: learningPlans.length > 0
      }
    };

    res.json({ stats });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to load dashboard statistics' });
  }
};

// Calculate career health score based on user data and activity
function calculateCareerHealthScore({ resumes, interviewSessions, jobApplications, learningPlans }) {
  let score = 0;
  let maxScore = 100;
  
  // Resume completeness (25 points)
  if (resumes.length > 0) {
    const latestResume = resumes[0];
    let resumeScore = 0;
    
    // Basic info (5 points)
    if (latestResume.name && latestResume.email) resumeScore += 5;
    
    // Skills (8 points)
    if (latestResume.skills && latestResume.skills.length >= 5) resumeScore += 8;
    else if (latestResume.skills && latestResume.skills.length >= 3) resumeScore += 5;
    
    // Experience (7 points)
    if (latestResume.experience && latestResume.experience.length >= 2) resumeScore += 7;
    else if (latestResume.experience && latestResume.experience.length >= 1) resumeScore += 4;
    
    // Education (3 points)
    if (latestResume.education && latestResume.education.length > 0) resumeScore += 3;
    
    // Projects (2 points)
    if (latestResume.projects && latestResume.projects.length > 0) resumeScore += 2;
    
    score += resumeScore;
  }
  
  // Interview performance (30 points)
  if (interviewSessions.length > 0) {
    const totalQuestions = interviewSessions.reduce((total, session) => total + session.history.length, 0);
    const totalScore = interviewSessions.reduce((total, session) => {
      const sessionScore = session.history.reduce((sum, qa) => sum + (qa.score || 0), 0);
      return total + sessionScore;
    }, 0);
    
    if (totalQuestions > 0) {
      const avgScore = totalScore / totalQuestions;
      score += Math.round((avgScore / 100) * 30);
    }
  }
  
  // Activity level (25 points)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  // Recent resumes (8 points)
  const recentResumes = resumes.filter(r => r.createdAt >= thirtyDaysAgo);
  if (recentResumes.length > 0) score += 8;
  
  // Recent interviews (10 points)
  const recentInterviews = interviewSessions.filter(s => s.createdAt >= thirtyDaysAgo);
  if (recentInterviews.length >= 3) score += 10;
  else if (recentInterviews.length >= 1) score += 6;
  
  // Recent job applications (7 points)
  const recentJobs = jobApplications.filter(j => j.createdAt >= thirtyDaysAgo);
  if (recentJobs.length >= 5) score += 7;
  else if (recentJobs.length >= 2) score += 4;
  else if (recentJobs.length >= 1) score += 2;
  
  // Learning engagement (20 points)
  if (learningPlans.length > 0) {
    const latestPlan = learningPlans[0];
    const completedItems = latestPlan.items.filter(item => item.status === 'Done').length;
    const totalItems = latestPlan.items.length;
    
    if (totalItems > 0) {
      const completionRate = completedItems / totalItems;
      score += Math.round(completionRate * 20);
    }
  }
  
  // Breakdown scores for frontend display
  const breakdown = {
    skillsMatch: Math.min(85, 60 + (resumes.length > 0 ? (resumes[0].skills?.length || 0) * 2 : 0)),
    experienceLevel: Math.min(95, 70 + (resumes.length > 0 ? (resumes[0].experience?.length || 0) * 10 : 0)),
    marketRelevance: Math.min(80, 45 + (jobApplications.length * 3) + (interviewSessions.length * 2))
  };
  
  return {
    overall: Math.min(maxScore, score),
    breakdown
  };
}

// Get recent activity across all user data
async function getRecentActivity(userId) {
  try {
    const activities = [];
    
    // Get recent data from all collections
    const [resumes, interviews, jobs, plans] = await Promise.all([
      Resume.find({ userId }).sort({ createdAt: -1 }).limit(5),
      InterviewSession.find({ userId }).sort({ createdAt: -1 }).limit(5),
      JobApplication.find({ userId }).sort({ createdAt: -1 }).limit(5),
      LearningPlan.find({ userId }).sort({ createdAt: -1 }).limit(3)
    ]);
    
    // Add resume activities
    resumes.forEach(resume => {
      activities.push({
        type: 'upload',
        description: `Uploaded resume: ${resume.filename || 'Resume'}`,
        date: resume.createdAt,
        id: resume._id
      });
    });
    
    // Add interview activities
    interviews.forEach(interview => {
      if (interview.isCompleted) {
        const avgScore = interview.history.length > 0 
          ? Math.round(interview.history.reduce((sum, qa) => sum + (qa.score || 0), 0) / interview.history.length)
          : 0;
        activities.push({
          type: 'interview',
          description: `Completed mock interview (${interview.history.length} questions, avg: ${avgScore}/100)`,
          date: interview.updatedAt,
          id: interview._id
        });
      } else {
        activities.push({
          type: 'interview',
          description: `Started mock interview for ${interview.role || 'General'} role`,
          date: interview.createdAt,
          id: interview._id
        });
      }
    });
    
    // Add job application activities
    jobs.forEach(job => {
      activities.push({
        type: 'job',
        description: `Applied to ${job.title} at ${job.company}`,
        date: job.createdAt,
        id: job._id
      });
    });
    
    // Add learning plan activities
    plans.forEach(plan => {
      const completedItems = plan.items.filter(item => item.status === 'Done').length;
      activities.push({
        type: 'learning',
        description: `Created learning plan for ${plan.role || 'career development'} (${completedItems}/${plan.items.length} completed)`,
        date: plan.createdAt,
        id: plan._id
      });
    });
    
    // Sort by date and return top 10
    return activities
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10);
      
  } catch (error) {
    console.error('Recent activity error:', error);
    return [];
  }
}

// Extract insights from latest resume
function getResumeInsights(resume) {
  const insights = {
    skills: resume.skills || [],
    topSkills: (resume.skills || []).slice(0, 8),
    experienceYears: calculateExperienceYears(resume.experience || []),
    education: getHighestEducation(resume.education || []),
    lastUpdated: resume.updatedAt,
    totalExperience: resume.experience?.length || 0,
    totalProjects: resume.projects?.length || 0,
    skillsCount: resume.skills?.length || 0,
    strengthAreas: identifyStrengthAreas(resume),
    suggestions: generateResumeSuggestions(resume)
  };
  
  return insights;
}

// Calculate years of experience from experience array
function calculateExperienceYears(experiences) {
  if (!experiences || experiences.length === 0) return '0 years';
  
  let totalMonths = 0;
  
  experiences.forEach(exp => {
    if (exp.startDate && exp.endDate) {
      const start = new Date(exp.startDate);
      const end = exp.endDate.toLowerCase() === 'present' ? new Date() : new Date(exp.endDate);
      
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        const diffMs = end.getTime() - start.getTime();
        const diffMonths = diffMs / (1000 * 60 * 60 * 24 * 30.44); // Average month length
        totalMonths += diffMonths;
      }
    }
  });
  
  const years = Math.floor(totalMonths / 12);
  const months = Math.round(totalMonths % 12);
  
  if (years === 0) return `${months} months`;
  if (months === 0) return `${years} year${years > 1 ? 's' : ''}`;
  return `${years}.${Math.round(months/12*10)} years`;
}

// Get highest education level
function getHighestEducation(education) {
  if (!education || education.length === 0) return 'Not specified';
  
  const levels = ['PhD', 'Doctorate', 'Master', 'Bachelor', 'Associate', 'Diploma'];
  
  for (const level of levels) {
    for (const edu of education) {
      if (edu.degree && edu.degree.toLowerCase().includes(level.toLowerCase())) {
        return `${edu.degree} - ${edu.institution}`;
      }
    }
  }
  
  return education[0].degree || 'Education completed';
}

// Identify strength areas based on resume content
function identifyStrengthAreas(resume) {
  const areas = [];
  
  if (resume.skills && resume.skills.length >= 8) {
    areas.push('Technical Skills');
  }
  
  if (resume.experience && resume.experience.length >= 3) {
    areas.push('Professional Experience');
  }
  
  if (resume.projects && resume.projects.length >= 2) {
    areas.push('Project Portfolio');
  }
  
  if (resume.education && resume.education.length > 0) {
    areas.push('Educational Background');
  }
  
  return areas;
}

// Generate suggestions for resume improvement
function generateResumeSuggestions(resume) {
  const suggestions = [];
  
  if (!resume.skills || resume.skills.length < 5) {
    suggestions.push('Add more relevant technical skills');
  }
  
  if (!resume.projects || resume.projects.length < 2) {
    suggestions.push('Include more project examples');
  }
  
  if (!resume.summary || resume.summary.length < 50) {
    suggestions.push('Add a compelling professional summary');
  }
  
  if (resume.experience && resume.experience.some(exp => !exp.bullets || exp.bullets.length < 2)) {
    suggestions.push('Add more detailed bullet points for experience');
  }
  
  return suggestions;
}

module.exports = exports;
