const express = require('express');
const router = express.Router();
const controller = require('../controllers/learningPlanController');
const { authMiddleware } = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

router.post('/generate', controller.generate);
router.get('/:resumeId', controller.get);
router.post('/update-status', controller.updateStatus);

module.exports = router;


