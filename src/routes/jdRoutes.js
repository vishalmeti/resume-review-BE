const express = require('express');
const router = express.Router();
const jdController = require('../controllers/jdController');

router.post('/match', jdController.matchResumeToJD);

module.exports = router;


