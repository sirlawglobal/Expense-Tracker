const recordBtn = document.getElementById('recordBtn');
const audioInput = document.getElementById('audioInput');

let mediaRecorder;
let audioChunks = [];

recordBtn.addEventListener('click', async () => {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
    recordBtn.textContent = 'Record';
  } else {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.start();
    recordBtn.textContent = 'Stop';

    audioChunks = []; // clear previous recordings

    mediaRecorder.ondataavailable = (e) => {
      audioChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = () => {
        const base64Audio = reader.result.split(',')[1];
        audioInput.value = base64Audio;

        // Optionally, reset chunks
        audioChunks = [];
      };
    };
  }
});
