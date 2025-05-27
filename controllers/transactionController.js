const Transaction = require('../models/Transaction');
// const tesseract = require('node-tesseract-ocr');
const tesseract = require('tesseract.js');
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


const sharp = require('sharp');
// const fs = require('fs');
// const path = require('path');

const { createWorker } = require('tesseract.js');

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
      .threshold(128, { 
        threshold: 128,
        greyscale: false
      })
      .toFile(tempPath);
    return tempPath;
  } catch (err) {
    console.error('Image processing failed, using original:', err);
    return imagePath; // Fallback to original
  }
}

async function extractTextWithWorker(imagePath) {
  const worker = await createWorker({
    logger: m => console.log(m),
  });

  try {
    await worker.loadLanguage('eng');
    await worker.initialize('eng');
    await worker.setParameters({
      tessedit_pageseg_mode: '6',
      tessedit_char_whitelist: '0123456789.,$€£ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz: ',
    });

    const { data } = await worker.recognize(imagePath);
    return data.text;
  } finally {
    await worker.terminate();
  }
}

async function extractText(imagePath) {
  try {
    // First try with worker for better reliability
    try {
      const text = await extractTextWithWorker(imagePath);
      if (text && text.trim().length > 5) return text;
    } catch (workerErr) {
      console.log('Worker approach failed, trying direct:', workerErr);
    }

    // Fallback to direct recognition
    const { data } = await tesseract.recognize(imagePath, 'eng', {
      preserve_interword_spaces: 1,
      tessedit_pageseg_mode: '6',
    });
    return data.text;
  } catch (err) {
    console.error('OCR extraction failed:', err);
    throw new Error('Text extraction failed');
  }
}

function parseAmount(text) {
  if (!text) return 0;

  // Try multiple patterns in order of likelihood
  const patterns = [
    /(?:total|amount|balance|due|payment)[\s:]*[\$€£]?[\s]*([\d,]+\.\d{2})/i,
    /[\$€£]\s*(\d+\.\d{2})/i,
    /(\d+\.\d{2})(?=\s*[\$€£])/i,
    /\b(\d{1,3}(?:,\d{3})*\.\d{2})\b/,
    /(\d+\.\d{2})/
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return parseFloat(match[1].replace(/,/g, ''));
    }
  }

  return 0;
}

exports.uploadReceipt = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const originalPath = req.file.path;
  let tempPath = null;
  let processedImagePath = null;

  try {
    // 1. Preprocess image
    processedImagePath = await preprocessImage(originalPath);
    console.log('Using image:', processedImagePath);

    // 2. Extract text with multiple fallbacks
    let ocrText = '';
    try {
      ocrText = await extractText(processedImagePath);
    } catch (err) {
      console.log('Primary OCR failed, trying fallback...');
      // Fallback to original image if processed version fails
      if (processedImagePath !== originalPath) {
        ocrText = await extractText(originalPath);
      }
    }

    if (!ocrText || ocrText.trim().length < 5) {
      throw new Error('Could not extract sufficient text from receipt');
    }

    console.log('Extracted text:', ocrText);

    // 3. Parse amount
    const amount = parseAmount(ocrText);
    console.log('Parsed amount:', amount);

    // 4. Save transaction
    const transaction = new Transaction({
      type: 'expense',
      amount,
      category: 'Receipt',
      description: ocrText.substring(0, 500),
      receiptPath: originalPath
    });

    await transaction.save();

    return res.json({
      success: true,
      amount,
      textPreview: ocrText.substring(0, 200)
    });

  } catch (err) {
    console.error('Processing failed:', err);
    return res.status(500).json({ 
      error: err.message || 'Receipt processing failed',
      success: false
    });
  } finally {
    // Cleanup files
    try {
      if (processedImagePath && processedImagePath !== originalPath) {
        fs.unlinkSync(processedImagePath);
      }
      fs.unlinkSync(originalPath);
    } catch (cleanupErr) {
      console.error('Cleanup error:', cleanupErr);
    }
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
