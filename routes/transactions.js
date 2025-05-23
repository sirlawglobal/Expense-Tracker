const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');
const {
  getDashboard,
  addTransaction,
  filterTransactions,
  processVoiceInput
} = require('../controllers/transactionController');

// Dashboard route
router.get('/', ensureAuthenticated, getDashboard);

// Add transaction routes
router.get('/add', ensureAuthenticated, (req, res) => {
  res.render('transactions/add');
});

router.post('/add', ensureAuthenticated, addTransaction);

// Filter transactions
router.get('/filter', ensureAuthenticated, filterTransactions);

// Process voice input
router.post('/process-voice', ensureAuthenticated, async (req, res) => {
  try {
    if (!req.files || !req.files.voiceInput) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }
    
    const voiceText = await processVoiceInput(req.files.voiceInput);
    res.json({ text: voiceText });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error processing voice input' });
  }
});

module.exports = router;