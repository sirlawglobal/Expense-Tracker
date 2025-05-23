const speech = require('@google-cloud/speech');
const vision = require('@google-cloud/vision');

const speechClient = new speech.SpeechClient();
const visionClient = new vision.ImageAnnotatorClient();

exports.processVoiceInput = async (audioFile) => {
  const audioBytes = audioFile.data.toString('base64');
  
  const request = {
    audio: {
      content: audioBytes,
    },
    config: {
      encoding: 'LINEAR16',
      sampleRateHertz: 16000,
      languageCode: 'en-US',
    },
  };

  const [response] = await speechClient.recognize(request);
  const transcription = response.results
    .map(result => result.alternatives[0].transcript)
    .join('\n');
    
  return transcription;
};

exports.processImageInput = async (imageFile) => {
  const [result] = await visionClient.textDetection(imageFile.data);
  const detections = result.textAnnotations;
  
  if (detections && detections.length > 0) {
    return detections[0].description;
  }
  
  return 'No text found in image';
};