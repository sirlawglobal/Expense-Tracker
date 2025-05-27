const express = require('express');
const router = express.Router();
const multer = require('multer');
const transactionController = require('../controllers/transactionController');

// Configure Multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'Uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

// Multer for image uploads (receipts)
const imageUpload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|image\/*/;
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype) {
      return cb(null, true);
    }
    cb(new Error('File type not supported. Please upload an image file (JPEG/PNG).'));
  },
});

// Multer for audio uploads
const audioUpload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /wav|mp3|ogg|audio\/*/;
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype) {
      return cb(null, true);
    }
    cb(new Error('File type not supported. Please upload an audio file (WAV/MP3/OGG).'));
  },
});

// Dashboard
router.get('/', transactionController.getDashboard);

// Add Transaction
router.post('/add', transactionController.addTransaction);

// Upload Receipt
router.post('/upload', imageUpload.single('receipt'), transactionController.uploadReceipt);

// Voice Input
router.post('/voice', audioUpload.single('audio'), transactionController.voiceInput);

module.exports = router;