const express = require('express');
const multer = require('multer');
const router = express.Router();
const resumeController = require('../controllers/resumeController');
const { authMiddleware } = require('../middleware/auth');

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const isPdf = file.mimetype === 'application/pdf' || (file.originalname || '').toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      return cb(new Error('Only PDF files are allowed'));
    }
    cb(null, true);
  }
});

// All routes require authentication
router.use(authMiddleware);

// Multer error-safe wrapper to return JSON on upload failures
router.post('/upload', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      const message =
        err.code === 'LIMIT_FILE_SIZE' ? 'File too large. Max 10MB allowed.' :
        (err.message?.includes('Only PDF') ? 'Only PDF files are allowed' : (err.message || 'Upload failed'));
      return res.status(400).json({ error: message });
    }
    next();
  })
}, resumeController.uploadAndParse);
router.get('/:id', resumeController.getResume);
router.get('/', resumeController.listResumes);

module.exports = router;


