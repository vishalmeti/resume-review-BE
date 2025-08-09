const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const analyticsController = require('../controllers/analyticsController');
const { authMiddleware } = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

// Get comprehensive dashboard statistics
router.get('/stats', dashboardController.getDashboardStats);

// Get detailed analytics
router.get('/analytics', analyticsController.getAnalytics);

module.exports = router;
