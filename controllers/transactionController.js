const Transaction = require('../models/Transaction');
const tesseract = require('node-tesseract-ocr');
const fs = require('fs');
const path = require('path');

exports.getDashboard = async (req, res) => {
  try {
    const transactions = await Transaction.find().sort({ date: -1 });
    const income = transactions
      .filter((t) => t.type === 'income')
      .reduce((acc, curr) => acc + curr.amount, 0);
    const expenses = transactions
      .filter((t) => t.type === 'expense')
      .reduce((acc, curr) => acc + curr.amount, 0);
    const profit = income - expenses;

    res.render('dashboard', {
      transactions,
      income,
      expenses,
      profit,
    });
  } catch (err) {
    res.status(500).send('Server Error');
  }
};

exports.addTransaction = async (req, res) => {

 
  try {
    const { type, amount, category, description } = req.body;
    const transaction = new Transaction({
      type,
      amount,
      category,
      description,
    });
    await transaction.save();
    res.redirect('/');
  } catch (err) {
    res.status(500).send('Server Error');
  }
};


exports.uploadReceipt = async (req, res) => {
  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }

  try {
    const imagePath = req.file.path;
    const result = await tesseract.recognize(imagePath, 'eng', {
      logger: (m) => console.log(m),
    });

    const text = result.data.text;
    console.log("Extracted text:", text);

    const amountMatch = text.match(/[\d,]+\.\d{2}/);
    const amount = amountMatch ? parseFloat(amountMatch[0].replace(/,/g, '')) : 0;

    const transaction = new Transaction({
      type: 'expense',
      amount,
      category: 'Receipt',
      description: text,
    });

    await transaction.save();

    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    res.redirect('/');
  } catch (err) {
    console.error("Error in uploadReceipt:", err);
    res.status(500).send('Server Error');
  }
};


exports.voiceInput = async (req, res) => {
  try {
    // Assuming the audio file is sent in the request body as base64
    const audioBuffer = Buffer.from(req.body.audio, 'base64');
    const audioPath = path.join(__dirname, '..', 'uploads', `${Date.now()}.wav`);
    fs.writeFileSync(audioPath, audioBuffer);

    // Use a speech-to-text service here (e.g., Google Cloud, AssemblyAI)
    // For demonstration, we'll assume the transcription is returned as 'transcribedText'
    const transcribedText = 'Sample transcription text';

    const transaction = new Transaction({
      type: 'expense',
      amount: 0, // Extract amount from transcribedText if possible
      category: 'Voice Input',
      description: transcribedText,
    });
    await transaction.save();
    fs.unlinkSync(audioPath);
    res.redirect('/');
  } catch (err) {
    res.status(500).send('Server Error');
  }
};
