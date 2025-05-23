// Voice recording functionality
let mediaRecorder;
let audioChunks = [];

document.getElementById('startRecording').addEventListener('click', async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    
    mediaRecorder.ondataavailable = (e) => {
      audioChunks.push(e.data);
    };
    
    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
      const audioFile = new File([audioBlob], 'voice_note.wav', { type: 'audio/wav' });
      
      // Create a FormData object and append the file
      const formData = new FormData();
      formData.append('voiceInput', audioFile);
      
      // Send to server for processing
      const response = await fetch('/transactions/process-voice', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      if (result.text) {
        document.querySelector('textarea[name="description"]').value = result.text;
      }
      
      audioChunks = [];
    };
    
    mediaRecorder.start();
    document.getElementById('stopRecording').disabled = false;
    document.getElementById('startRecording').disabled = true;
  } catch (err) {
    console.error('Error accessing microphone:', err);
  }
});

document.getElementById('stopRecording').addEventListener('click', () => {
  mediaRecorder.stop();
  document.getElementById('stopRecording').disabled = true;
  document.getElementById('startRecording').disabled = false;
});


// Preview receipt image before upload
document.querySelector('input[name="receiptImage"]').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      const preview = document.getElementById('receiptPreview');
      preview.src = event.target.result;
      preview.style.display = 'block';
    };
    reader.readAsDataURL(file);
  }
});