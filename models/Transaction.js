const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['income', 'expense'],
    required: true
  },
  category: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  receiptImage: {
    type: String
  },
  date: {
    type: Date,
    default: Date.now
  },
  voiceNote: {
    type: String
  },
  isAutoCategorized: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model('Transaction', TransactionSchema);