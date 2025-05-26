const express = require('express');
const router = express.Router();
const multer = require('multer');
const transactionController = require('../controllers/transactionController');

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  },
});
const upload = multer({ storage: storage });

// Dashboard
router.get('/', transactionController.getDashboard);

// Add Transaction
router.post('/add', transactionController.addTransaction);

// Upload Receipt
router.post('/upload', upload.single('receipt'), transactionController.uploadReceipt);

// Voice Input
router.post('/voice', transactionController.voiceInput);

module.exports = router;
