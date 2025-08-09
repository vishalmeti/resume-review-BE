# Dashboard API Documentation

## Overview
This document describes the comprehensive dashboard APIs that provide real-time, user-specific data for the ResumeReview application dashboard.

## Authentication
All dashboard endpoints require JWT Bearer token authentication:
```
Authorization: Bearer <jwt_token>
```

## Endpoints

### 1. Dashboard Statistics
**GET** `/api/dashboard/stats`

Returns comprehensive dashboard data including career health score, user statistics, recent activity, and resume insights.

#### Response Format
```json
{
  "stats": {
    "careerHealthScore": {
      "overall": 85,
      "breakdown": {
        "skillsMatch": 78,
        "experienceLevel": 82,
        "marketRelevance": 65
      }
    },
    "userStats": {
      "totalResumes": 3,
      "totalInterviews": 8,
      "totalJobApplications": 12,
      "totalLearningPlans": 2,
      "avgInterviewScore": 78,
      "totalQuestions": 45
    },
    "jobStats": {
      "total": 12,
      "applied": 8,
      "interviewing": 2,
      "offers": 1,
      "accepted": 1
    },
    "recentActivity": [
      {
        "type": "upload",
        "description": "Uploaded resume: Software_Engineer_Resume.pdf",
        "date": "2024-01-15T10:30:00Z",
        "id": "ObjectId"
      },
      {
        "type": "interview", 
        "description": "Completed mock interview (5 questions, avg: 85/100)",
        "date": "2024-01-14T15:20:00Z",
        "id": "ObjectId"
      }
    ],
    "resumeInsights": {
      "skills": ["JavaScript", "React", "Node.js"],
      "topSkills": ["JavaScript", "React", "Node.js", "Python"],
      "experienceYears": "3.5 years",
      "education": "Bachelor Computer Science - MIT",
      "lastUpdated": "2024-01-15T10:30:00Z",
      "totalExperience": 3,
      "totalProjects": 5,
      "skillsCount": 12,
      "strengthAreas": ["Technical Skills", "Professional Experience"],
      "suggestions": [
        "Add more detailed bullet points for experience",
        "Include more project examples"
      ]
    },
    "hasData": {
      "resumes": true,
      "interviews": true,
      "jobs": true,
      "plans": true
    }
  }
}
```

#### Career Health Score Calculation
The career health score (0-100) is calculated based on:

1. **Resume Completeness (25 points)**
   - Basic info: 5 points
   - Skills (5+ skills): 8 points
   - Experience (2+ jobs): 7 points
   - Education: 3 points
   - Projects: 2 points

2. **Interview Performance (30 points)**
   - Based on average score across all completed interviews
   - Weighted by total questions answered

3. **Activity Level (25 points)**
   - Recent resumes (last 30 days): 8 points
   - Recent interviews: 10 points
   - Recent job applications: 7 points

4. **Learning Engagement (20 points)**
   - Based on learning plan completion rate

#### Breakdown Scores
- **Skills Match**: Based on number and relevance of skills
- **Experience Level**: Based on years and depth of experience
- **Market Relevance**: Based on recent activity and job market alignment

### 2. Detailed Analytics
**GET** `/api/dashboard/analytics?period=30`

Returns detailed analytics for charts and insights over a specified period.

#### Query Parameters
- `period` (optional): Number of days to analyze (default: 30)

#### Response Format
```json
{
  "analytics": {
    "period": 30,
    "interviewTrends": {
      "raw": [
        {
          "date": "2024-01-15T15:20:00Z",
          "score": 85,
          "questions": 5,
          "role": "Software Engineer"
        }
      ],
      "movingAverage": [
        {
          "date": "2024-01-15T15:20:00Z",
          "score": 83
        }
      ],
      "latest": {
        "date": "2024-01-15T15:20:00Z",
        "score": 85,
        "questions": 5,
        "role": "Software Engineer"
      },
      "improvement": 12
    },
    "skillAnalysis": {
      "topSkills": [
        {
          "skill": "JavaScript",
          "frequency": 3,
          "performance": 87
        }
      ],
      "improvementSkills": [
        {
          "skill": "System Design",
          "avgScore": 65,
          "frequency": 2
        }
      ],
      "totalUniqueSkills": 15,
      "skillsWithPerformanceData": 8
    },
    "jobApplicationStats": {
      "total": 12,
      "statusCounts": {
        "Applied": 8,
        "Interviewing": 2,
        "Offer": 1,
        "Rejected": 1,
        "Accepted": 0,
        "On Hold": 0
      },
      "conversionRates": {
        "interviewRate": 25,
        "offerRate": 8,
        "acceptanceRate": 0
      },
      "timeline": [
        {
          "date": "2024-01-15T10:00:00Z",
          "company": "Google",
          "title": "Software Engineer",
          "status": "Applied"
        }
      ],
      "recentApplications": []
    },
    "learningProgress": {
      "totalPlans": 2,
      "activePlans": 1,
      "completionRate": 65,
      "totalItems": 12,
      "completedItems": 8,
      "inProgressItems": 2,
      "latestPlan": {
        "role": "Frontend Developer",
        "totalItems": 6,
        "completed": 4,
        "inProgress": 1,
        "createdAt": "2024-01-10T09:00:00Z"
      }
    },
    "weeklyActivity": [
      {
        "week": "Week 1",
        "weekStart": "2024-01-08T00:00:00Z",
        "resumes": 1,
        "interviews": 2,
        "jobs": 3,
        "plans": 0,
        "total": 6
      }
    ],
    "insights": [
      {
        "type": "positive",
        "category": "Interview Performance",
        "message": "Great progress! Your interview scores improved by 12 points.",
        "action": "Keep practicing to maintain momentum!"
      }
    ]
  }
}
```

## Data Flow and Dependencies

### Resume Data Flow
1. User uploads resume → Resume model with `userId`
2. AI parses resume content → stored in Resume document
3. Dashboard calculates insights from latest resume
4. Skills and experience feed into career health score

### Interview Data Flow
1. User starts interview → InterviewSession with `userId` and `resumeId`
2. User answers questions → QA pairs stored in session history
3. AI provides feedback and scores → stored in history
4. Analytics aggregate performance over time
5. Scores contribute to career health calculation

### Job Application Data Flow
1. User adds job application → JobApplication with `userId`
2. Status updates tracked over time
3. Conversion rates calculated for analytics
4. Activity contributes to market relevance score

### Learning Plan Data Flow
1. User generates learning plan → LearningPlan with `userId` and `resumeId`
2. Progress tracked through item status updates
3. Completion rate feeds into career health score
4. Latest plan shown in dashboard insights

## Real-time Updates
- Dashboard data refreshes on page load
- Recent activity updates immediately after actions
- Career health score recalculates with new data
- All data is user-isolated and secure

## Error Handling
- Returns 401 for unauthenticated requests
- Returns 500 for server errors with generic messages
- Gracefully handles missing data with default values
- Frontend shows loading states and error messages

## Performance Considerations
- Data aggregated in single API calls to minimize requests
- Recent activity limited to last 10 items
- Analytics queries optimized with date ranges
- Caching implemented for frequently calculated scores
