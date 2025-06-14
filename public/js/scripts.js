document.addEventListener('DOMContentLoaded', () => {
  // Chart.js Configuration
  let chartInstance = null;
  const viewChartBtn = document.getElementById('viewChart');
  const chartModal = document.getElementById('chartModal');
  const closeChartModalBtn = document.getElementById('closeChartModal');

  const initializeChart = () => {
    const canvas = document.getElementById('financeChart');
    if (!canvas) {
      console.error('Chart canvas #financeChart not found in the DOM');
      return;
    }
    const income = parseFloat(canvas.dataset.income) || 0;
    const expenses = parseFloat(canvas.dataset.expenses) || 0;
    console.log('Chart data:', { income, expenses });

    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('Failed to get 2D context for canvas');
        return;
      }
      chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Income', 'Expenses'],
          datasets: [{
            label: 'Financial Overview',
            data: [income, expenses],
            backgroundColor: ['rgba(76, 175, 80, 0.5)', 'rgba(244, 81, 30, 0.5)'],
            borderColor: ['#4CAF50', '#F4511E'],
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Amount (₦)'
              }
            }
          },
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              callbacks: {
                label: (context) => `₦${context.raw.toLocaleString()}`
              }
            }
          }
        }
      });
    } catch (err) {
      console.error('Chart.js initialization error:', err);
    }
  };

  if (viewChartBtn && chartModal && closeChartModalBtn) {
    viewChartBtn.addEventListener('click', () => {
      chartModal.setAttribute('aria-hidden', 'false');
      if (!chartInstance) {
        initializeChart();
      }
    });

    closeChartModalBtn.addEventListener('click', () => {
      chartModal.setAttribute('aria-hidden', 'true');
    });

    chartModal.addEventListener('click', (e) => {
      if (e.target === chartModal) {
        chartModal.setAttribute('aria-hidden', 'true');
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && chartModal.getAttribute('aria-hidden') === 'false') {
        chartModal.setAttribute('aria-hidden', 'true');
      }
    });
  } else {
    console.error('Chart modal elements missing:', { viewChartBtn, chartModal, closeChartModalBtn });
  }

  // Transaction Modal Toggle
  const viewTransactionsBtn = document.getElementById('viewTransactions');
  const transactionsModal = document.getElementById('transactionsModal');
  const closeModalBtn = document.getElementById('closeModal');

  if (viewTransactionsBtn && transactionsModal && closeModalBtn) {
    viewTransactionsBtn.addEventListener('click', () => {
      transactionsModal.setAttribute('aria-hidden', 'false');
    });

    closeModalBtn.addEventListener('click', () => {
      transactionsModal.setAttribute('aria-hidden', 'true');
    });

    transactionsModal.addEventListener('click', (e) => {
      if (e.target === transactionsModal) {
        transactionsModal.setAttribute('aria-hidden', 'true');
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && transactionsModal.getAttribute('aria-hidden') === 'false') {
        transactionsModal.setAttribute('aria-hidden', 'true');
      }
    });
  } else {
    console.error('Transaction modal elements missing:', { viewTransactionsBtn, transactionsModal, closeModalBtn });
  }

  // Voice Recording Logic
  const recordBtn = document.getElementById('recordBtn');
  const recordText = document.getElementById('recordText');
  const audioPreview = document.getElementById('audioPreview');
  const audioInput = document.getElementById('audioInput');
  const submitVoice = document.getElementById('submitVoice');
  const voiceForm = document.getElementById('voiceForm');

  if (recordBtn && recordText && audioPreview && audioInput && submitVoice && voiceForm) {
    let mediaRecorder;
    let audioChunks = [];

    recordBtn.addEventListener('click', async () => {
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        recordText.textContent = 'Start Recording';
      } else {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          mediaRecorder = new MediaRecorder(stream);
          audioChunks = [];

          mediaRecorder.addEventListener('dataavailable', (e) => {
            audioChunks.push(e.data);
          });

          mediaRecorder.addEventListener('stop', () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            const audioUrl = URL.createObjectURL(audioBlob);
            audioPreview.src = audioUrl;
            audioPreview.style.display = 'block';
            submitVoice.disabled = false;

            const audioFile = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(audioFile);
            audioInput.files = dataTransfer.files;

            console.log('Audio file set:', audioInput.files[0]);
          });

          mediaRecorder.start();
          recordText.textContent = 'Stop Recording';
        } catch (err) {
          console.error('Recording error:', err);
          alert('Failed to start recording. Please allow microphone access.');
        }
      }
    });

    voiceForm.addEventListener('submit', (e) => {
      console.log('Form submitting with files:', audioInput.files);
    });
  } else {
    console.error('Voice recording elements missing:', { recordBtn, recordText, audioPreview, audioInput, submitVoice, voiceForm });
  }
});