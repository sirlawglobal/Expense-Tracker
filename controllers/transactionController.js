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

const sharp = require('sharp');


// Image Preprocessing Function with Sharp
async function preprocessImage(inputPath) {
  try {
    // Read, process, and overwrite in one operation
    const processedBuffer = await sharp(inputPath)
      .greyscale()
      .normalise()
      .linear(1.1, 5)
      .toBuffer();

    // Write processed buffer back to original file
    await fs.promises.writeFile(inputPath, processedBuffer);

    console.log('Image processed successfully');
  } catch (err) {
    console.error("Image processing error:", err);
    throw err;
  }
}


exports.uploadReceipt = async (req, res) => {
  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }

  const imagePath = req.file.path;
  console.log("Image uploaded to:", imagePath);

  try {
    // 1. Preprocess image
    const processedBuffer = await sharp(imagePath)
      .greyscale()
      .normalise()
      .linear(1.1, 5)
      .toBuffer();
    await fs.promises.writeFile(imagePath, processedBuffer);

    // 2. OCR Processing with better error handling
    let ocrText = '';
    try {
      const result = await tesseract.recognize(imagePath, 'eng', {
        logger: m => console.log(m),
        preserve_interword_spaces: 1,
        tessedit_pageseg_mode: 6,
      });
      ocrText = result.data?.text || '';
    } catch (ocrError) {
      console.error("OCR Error:", ocrError);
      throw new Error("Failed to process receipt text");
    }

    console.log("Extracted text:", ocrText);

    // 3. Parse amount with more robust matching
    let amount = 0;
    const amountPatterns = [
      /(?:Total|Amount|TOTAL|AMOUNT)[\s:]*[\$€£]?[\s]*([\d,]+\.\d{2})/i,
      /([\d,]+\.\d{2})(?=\s*[\$€£])/i,
      /(\d+\.\d{2})/
    ];

    for (const pattern of amountPatterns) {
      const match = ocrText.match(pattern);
      if (match) {
        amount = parseFloat(match[1]?.replace(/,/g, '') || '0');
        break;
      }
    }

    console.log("Parsed amount:", amount);

    // 4. Save transaction
    const transaction = new Transaction({
      type: 'expense',
      amount,
      category: 'Receipt',
      description: ocrText.substring(0, 200),
    });
    await transaction.save();

    // 5. Clean up
    fs.unlinkSync(imagePath);
    res.redirect('/');
  } catch (err) {
    console.error("Error in uploadReceipt:", err);
    if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    res.status(500).send(err.message || "Receipt processing failed");
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
