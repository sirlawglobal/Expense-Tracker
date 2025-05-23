const Transaction = require('../models/Transaction');
const { processVoiceInput, processImageInput } = require('../services/googleServices');

// Categories for auto-categorization
const expenseCategories = ['food', 'transport', 'utilities', 'rent', 'supplies', 'entertainment', 'other'];
const incomeCategories = ['sales', 'investment', 'salary', 'other'];

exports.getDashboard = async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.user.id }).sort({ date: -1 });
    
    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
      
    const expenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
      
    const profit = income - expenses;
    
    res.render('dashboard', {
      transactions,
      income,
      expenses,
      profit,
      user: req.user
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

exports.addTransaction = async (req, res) => {
  try {
    const { amount, type, description, category } = req.body;
    
    let transactionData = {
      user: req.user.id,
      amount,
      type,
      description,
      category
    };
    
    // Handle voice input
    if (req.files && req.files.voiceInput) {
      const voiceText = await processVoiceInput(req.files.voiceInput);
      transactionData.description = voiceText;
      transactionData.voiceNote = req.files.voiceInput.name;
    }
    
    // Handle image upload (receipt)
    if (req.files && req.files.receiptImage) {
      const receiptText = await processImageInput(req.files.receiptImage);
      transactionData.description = receiptText;
      transactionData.receiptImage = req.files.receiptImage.name;
      
      // Auto-categorize based on receipt text
      const autoCategory = autoCategorizeTransaction(receiptText, type);
      if (autoCategory) {
        transactionData.category = autoCategory;
        transactionData.isAutoCategorized = true;
      }
    }
    
    const newTransaction = new Transaction(transactionData);
    await newTransaction.save();
    
    req.flash('success_msg', 'Transaction added successfully');
    res.redirect('/transactions');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error adding transaction');
    res.redirect('/transactions/add');
  }
};

function autoCategorizeTransaction(text, type) {
  const categories = type === 'income' ? incomeCategories : expenseCategories;
  
  for (const category of categories) {
    if (text.toLowerCase().includes(category)) {
      return category;
    }
  }
  
  return type === 'income' ? 'other income' : 'other expense';
}

exports.filterTransactions = async (req, res) => {
  try {
    const { filter } = req.query;
    let query = { user: req.user.id };
    
    if (filter && filter !== 'all') {
      query.type = filter;
    }
    
    const transactions = await Transaction.find(query).sort({ date: -1 });
    res.json(transactions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
};