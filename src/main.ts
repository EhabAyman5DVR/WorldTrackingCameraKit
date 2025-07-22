
import {
    bootstrapCameraKit,
    CameraKitSession,
    createMediaStreamSource,
    //Transform2D,
} from '@snap/camera-kit';

let mediaStream: MediaStream;


const liveRenderTarget = document.getElementById(
    'canvas'
) as HTMLCanvasElement;

async function init() {
    const cameraKit = await bootstrapCameraKit({ apiToken: 'eyJhbGciOiJIUzI1NiIsImtpZCI6IkNhbnZhc1MyU0hNQUNQcm9kIiwidHlwIjoiSldUIn0.eyJhdWQiOiJjYW52YXMtY2FudmFzYXBpIiwiaXNzIjoiY2FudmFzLXMyc3Rva2VuIiwibmJmIjoxNzUyNDkyMzM3LCJzdWIiOiJlMDA1YTEzMy1jNmNlLTRmNmUtYjMyMC05YTNkYzVjOTRlZTN-U1RBR0lOR35mZjZkOGU3OC0xZWYzLTQ3ZWUtOGY0ZC1lM2Y5MDZjOTZlZTEifQ.yf7OFtk9dhdjq8FsmXghKNea_7GMoBF01AGEpTVj6ZY' });
    const session = await cameraKit.createSession({ liveRenderTarget });
    const lenses = await cameraKit.lensRepository.loadLens('9ed04b81-fe59-4f95-8fc5-2592d96f847e',
        'c352182f-89be-4007-b24c-8fcf50c56d56'
    );

    session.applyLens(lenses);

    // Remove fullscreen class after lens is loaded
    liveRenderTarget.classList.remove('fullscreen');

    await setCameraKitSource(session);

}

async function setCameraKitSource(
    session: CameraKitSession) {

    mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
    });

    const source = createMediaStreamSource(mediaStream, { cameraType: 'environment' });

    await session.setSource(source);

   // source.setTransform(Transform2D.MirrorX);



    session.play();
}



init();

// Request microphone access on page load
window.addEventListener('DOMContentLoaded', async () => {
  try {
    await navigator.mediaDevices.getUserMedia({ audio: true });
    // Optionally, you can show a message or icon indicating mic is ready
  } catch (err) {
    alert('Microphone access is required for voice recording. Please allow access in your browser settings.');
  }
});

// --- Voice Recording Logic (MDN style) ---
let micStream: MediaStream | null = null;
let mediaRecorder: MediaRecorder | null = null;
let audioChunks: BlobPart[] = [];

const recordBtn = document.getElementById('record-btn') as HTMLButtonElement | null;
const downloadLink = document.getElementById('download-link') as HTMLAnchorElement | null;

// Request mic access on page load and keep the stream
window.addEventListener('DOMContentLoaded', async () => {
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Optionally, show a message or icon indicating mic is ready
  } catch (err) {
    alert('Microphone access is required for voice recording. Please allow access in your browser settings.');
  }
});

if (recordBtn && downloadLink) {
  recordBtn.addEventListener('mousedown', startRecording);
  recordBtn.addEventListener('touchstart', startRecording);
  recordBtn.addEventListener('mouseup', stopRecording);
  recordBtn.addEventListener('mouseleave', stopRecording);
  recordBtn.addEventListener('touchend', stopRecording);
  recordBtn.addEventListener('touchcancel', stopRecording);

  function startRecording(e: Event) {
    e.preventDefault();
    if (!micStream) {
      alert('Microphone not available.');
      return;
    }
    if (mediaRecorder && mediaRecorder.state === 'recording') return;
    audioChunks = [];
    mediaRecorder = new MediaRecorder(micStream);
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) audioChunks.push(event.data);
    };
    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
      const audioUrl = URL.createObjectURL(audioBlob);
      downloadLink!.href = audioUrl;
      downloadLink!.style.display = 'block';
    };
    mediaRecorder.start();
    recordBtn!.textContent = 'Recording...';
    recordBtn!.style.background = '#d32f2f';
  }

  function stopRecording(e: Event) {
    e.preventDefault();
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      recordBtn!.textContent = 'Hold to Record';
      recordBtn!.style.background = '#ff5555';
    }
  }
}