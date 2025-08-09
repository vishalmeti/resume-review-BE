const express = require('express');
const router = express.Router();
const jdController = require('../controllers/jdController');
const { authMiddleware } = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

router.post('/match', jdController.matchResumeToJD);

module.exports = router;


