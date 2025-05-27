const recordBtn = document.getElementById('recordBtn');
const audioPreview = document.getElementById('audioPreview');
const audioInput = document.getElementById('audioInput');
const submitVoice = document.getElementById('submitVoice');
const voiceForm = document.getElementById('voiceForm');
let mediaRecorder;
let recordedChunks = [];

recordBtn.addEventListener('click', async () => {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
    recordBtn.textContent = '🎙️ Start Recording';
  } else {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      recordedChunks = [];

      mediaRecorder.ondataavailable = (e) => {
        recordedChunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(recordedChunks, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        audioPreview.src = audioUrl;
        audioPreview.style.display = 'block';
        submitVoice.disabled = false;

        // Set audio file to input
        const audioFile = new File([audioBlob], 'recording.wav', { type: 'audio/wav' });
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(audioFile);
        audioInput.files = dataTransfer.files;

        // Debugging: Verify file is set
        console.log('Audio file set:', audioInput.files[0]);
      };

      mediaRecorder.start();
      recordBtn.textContent = '🛑 Stop Recording';
    } catch (err) {
      console.error('Recording error:', err);
      alert('Failed to start recording. Please allow microphone access.');
    }
  }
});

// Optional: Debug form submission
voiceForm.addEventListener('submit', (e) => {
  console.log('Form submitting with files:', audioInput.files);
});