const express = require('express');
const router = express.Router();
const interviewController = require('../controllers/interviewController');

router.post('/start', interviewController.startSession);
router.post('/:sessionId/answer', interviewController.answerQuestion);
router.get('/:sessionId/report', interviewController.getReport);
router.get('/', interviewController.listSessions);
router.get('/session/:sessionId', interviewController.getSession);

module.exports = router;


