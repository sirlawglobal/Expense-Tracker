const Transaction = require('../models/Transaction');
const tesseract = require('tesseract.js');
const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');
const { createWorker } = require('tesseract.js');

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
    res.status(500).render('error', { error: 'Server Error' });
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
    res.status(500).render('error', { error: 'Server Error' });
  }
};

// Keyword lists
const incomeKeywords = [
  { keyword: 'payment received', weight: 2 },
  { keyword: 'credited', weight: 1 },
  { keyword: 'deposit', weight: 1 },
  { keyword: 'received from', weight: 1.5 },
  { keyword: 'amount received', weight: 2 },
  { keyword: 'payment successful', weight: 2 },
  { keyword: 'paid to you', weight: 1.5 },
  { keyword: 'thank you for your payment', weight: 2 },
  { keyword: 'has been credited', weight: 1.5 },
  { keyword: 'received your payment', weight: 2 },
  { keyword: 'we have received', weight: 1.5 },
  { keyword: 'payment confirmation', weight: 2 },
  { keyword: 'payment date', weight: 1 },
  { keyword: 'payment from', weight: 1.5 },
];

const expenseKeywords = [
  { keyword: 'invoice', weight: 2 },
  { keyword: 'balance due', weight: 1.5 },
  { keyword: 'amount due', weight: 1.5 },
  { keyword: 'billed to', weight: 1 },
  { keyword: 'payment method', weight: 1 },
  { keyword: 'subtotal', weight: 1.5 },
  { keyword: 'total due', weight: 2 },
  { keyword: 'remit to', weight: 1 },
  { keyword: 'purchase', weight: 1.5 },
  { keyword: 'items purchased', weight: 1.5 },
  { keyword: 'item(s)', weight: 1 },
  { keyword: 'quantity', weight: 1 },
  { keyword: 'product', weight: 1 },
  { keyword: 'office supplies', weight: 1.5 },
  { keyword: 'shipping method', weight: 1 },
  { keyword: 'unit price', weight: 1 },
  { keyword: 'due on receipt', weight: 1.5 },
  { keyword: 'terms', weight: 1 },
  { keyword: 'bill to', weight: 1 },
  { keyword: 'sales tax', weight: 1.5 },
  { keyword: 'payment instructions', weight: 1 },
];

// Detect transaction type based on text
function detectTransactionType(text) {
  const textLower = text.toLowerCase();
  let incomeScore = 0;
  let expenseScore = 0;

  incomeKeywords.forEach(({ keyword, weight }) => {
    if (textLower.includes(keyword)) incomeScore += weight;
  });

  expenseKeywords.forEach(({ keyword, weight }) => {
    if (textLower.includes(keyword)) expenseScore += weight;
  });

  console.log('Income score:', incomeScore);
  console.log('Expense score:', expenseScore);

  if (incomeScore > expenseScore) return 'income';
  if (expenseScore > incomeScore) return 'expense';
  return 'unknown';
}

// Preprocess the image
async function preprocessImage(imagePath) {
  const tempPath = path.join(
    path.dirname(imagePath),
    `processed_${Date.now()}${path.extname(imagePath)}`
  );

  try {
    await sharp(imagePath)
      .greyscale()
      .normalise()
      .linear(1.2, -(128 * 0.2))
      .sharpen()
      .threshold(128, { threshold: 128, greyscale: false })
      .toFile(tempPath);
    return tempPath;
  } catch (err) {
    console.error('Image processing failed, using original:', err);
    return imagePath;
  }
}

// OCR using Tesseract.js
async function extractTextWithWorker(imagePath) {
  const worker = await createWorker();

  try {
    await worker.setParameters({
      tessedit_pageseg_mode: '6',
      tessedit_char_whitelist: '0123456789.,$€£ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz: ',
    });

    const { data } = await worker.recognize(imagePath);
    return data.text;
  } catch (err) {
    console.error('Worker recognition error:', err);
    throw err;
  } finally {
    await worker.terminate();
  }
}

// OCR fallback
async function extractText(imagePath) {
  try {
    const text = await extractTextWithWorker(imagePath);
    if (text && text.trim().length > 5) return text;

    throw new Error('Insufficient text extracted');
  } catch (workerErr) {
    console.log('Worker approach failed:', workerErr.message);

    try {
      const { recognize } = require('tesseract.js');
      const { data: { text } } = await recognize(imagePath);
      return text;
    } catch (simpleErr) {
      console.error('Simple recognition failed:', simpleErr);
      throw new Error('All OCR attempts failed');
    }
  }
}

// Extract amount from text
function parseAmount(text) {
  if (!text) return 0;

  const patterns = [
    /(?:total|amount|balance|due|payment)[\s:]*[\$€£]?[\s]*([\d,]+\.\d{2})/i,
    /[\$€£]\s*(\d+\.\d{2})/i,
    /(\d+\.\d{2})(?=\s*[\$€£])/i,
    /\b(\d{1,3}(?:,\d{3})*\.\d{2})\b/,
    /(\d+\.\d{2})/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return parseFloat(match[1].replace(/,/g, ''));
    }
  }

  return 0;
}

// Utility for file cleanup
async function cleanupFile(filePath) {
  if (!filePath) return;
  try {
    await fs.unlink(filePath);
  } catch (err) {
    console.error('Cleanup error:', err);
  }
}

// Main upload controller
exports.uploadReceipt = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const originalPath = req.file.path;
  let processedImagePath = null;

  try {
    processedImagePath = await preprocessImage(originalPath);
    console.log('Using image:', processedImagePath);

    let ocrText = '';
    try {
      ocrText = await extractText(processedImagePath);
    } catch (err) {
      console.log('Primary OCR failed, trying fallback...');
      if (processedImagePath !== originalPath) {
        ocrText = await extractText(originalPath);
      }
    }

    if (!ocrText || ocrText.trim().length < 5) {
      throw new Error('Could not extract sufficient text from receipt');
    }

    console.log('Extracted text:', ocrText);

    const amount = parseAmount(ocrText);
    console.log('Parsed amount:', amount);

    const type = detectTransactionType(ocrText);
    console.log('Detected type:', type);

    const transaction = new Transaction({
      type,
      amount,
      category: 'Receipt',
      description: ocrText.substring(0, 500),
      receiptPath: originalPath,
    });

    await transaction.save();

    return res.json({
      success: true,
      amount,
      type,
      textPreview: ocrText.substring(0, 200),
    });
  } catch (err) {
    console.error('Processing failed:', err);
    return res.status(500).json({
      error: err.message || 'Receipt processing failed',
      success: false,
    });
  } finally {
    if (processedImagePath && processedImagePath !== originalPath) {
      await cleanupFile(processedImagePath);
    }
    await cleanupFile(originalPath);
  }
};

exports.voiceInput = async (req, res) => {
  try {
    console.log('Voice input received, req.file:', req.file);
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    const audioPath = req.file.path;

    // Placeholder for speech-to-text (replace with actual service)
    const transcribedText = 'Sample transcription text'; // Use AssemblyAI or similar

    const amount = parseAmount(transcribedText);
    const type = detectTransactionType(transcribedText);

    const transaction = new Transaction({
      type: type || 'expense',
      amount: amount || 0,
      category: 'Voice Input',
      description: transcribedText.substring(0, 500),
    });

    await transaction.save();
    await cleanupFile(audioPath);

    res.redirect('/');
  } catch (err) {
    console.error('Voice input error:', err);
    await cleanupFile(req.file?.path);
    res.status(500).render('error', { error: 'Failed to process audio. Please try again.' });
  }
};