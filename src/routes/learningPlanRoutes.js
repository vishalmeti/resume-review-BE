const express = require('express');
const router = express.Router();
const controller = require('../controllers/learningPlanController');

router.post('/generate', controller.generate);
router.get('/:resumeId', controller.get);
router.post('/update-status', controller.updateStatus);

module.exports = router;


