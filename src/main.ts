
import {
  bootstrapCameraKit,
  CameraKitSession,
  createMediaStreamSource,
  //Transform2D,
} from '@snap/camera-kit';

import { aiService } from './services/AIService';

// Store the current session
let currentSession: CameraKitSession;

let mediaStream: MediaStream;


const liveRenderTarget = document.getElementById(
  'canvas'
) as HTMLCanvasElement;

async function init() {
  const cameraKit = await bootstrapCameraKit({ apiToken: 'eyJhbGciOiJIUzI1NiIsImtpZCI6IkNhbnZhc1MyU0hNQUNQcm9kIiwidHlwIjoiSldUIn0.eyJhdWQiOiJjYW52YXMtY2FudmFzYXBpIiwiaXNzIjoiY2FudmFzLXMyc3Rva2VuIiwibmJmIjoxNzUyNDkyMzM3LCJzdWIiOiJlMDA1YTEzMy1jNmNlLTRmNmUtYjMyMC05YTNkYzVjOTRlZTN-U1RBR0lOR35mZjZkOGU3OC0xZWYzLTQ3ZWUtOGY0ZC1lM2Y5MDZjOTZlZTEifQ.yf7OFtk9dhdjq8FsmXghKNea_7GMoBF01AGEpTVj6ZY' });
  currentSession = await cameraKit.createSession({ liveRenderTarget });
  const lenses = await cameraKit.lensRepository.loadLens('9ed04b81-fe59-4f95-8fc5-2592d96f847e',
    'c352182f-89be-4007-b24c-8fcf50c56d56'
  );

  currentSession.applyLens(lenses);

  // Remove fullscreen class after lens is loaded
  liveRenderTarget.classList.remove('fullscreen');

  await setCameraKitSource(currentSession);
const loginResponse = await aiService.login('developer@5d-vr.com', 'Dev$&PassAI2654');
        console.log(loginResponse)
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

// --- WAV encoding helper ---
function encodeWAV(audioBuffer: AudioBuffer): Blob {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  // Interleave channels
  let interleaved;
  if (numChannels === 2) {
    const left = audioBuffer.getChannelData(0);
    const right = audioBuffer.getChannelData(1);
    interleaved = new Float32Array(left.length + right.length);
    for (let i = 0, j = 0; i < left.length; i++, j += 2) {
      interleaved[j] = left[i];
      interleaved[j + 1] = right[i];
    }
  } else {
    interleaved = audioBuffer.getChannelData(0);
  }

  // Convert float audio data to 16-bit PCM
  const buffer = new ArrayBuffer(44 + interleaved.length * 2);
  const view = new DataView(buffer);

  // Write WAV header
  function writeString(view: DataView, offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + interleaved.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size
  view.setUint16(20, format, true); // AudioFormat
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bitDepth / 8, true);
  view.setUint16(32, numChannels * bitDepth / 8, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, interleaved.length * 2, true);

  // Write PCM samples
  let offset = 44;
  for (let i = 0; i < interleaved.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, interleaved[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

// --- Silence trimming helper ---
function trimTrailingSilence(samples: Float32Array, threshold = 0.0001): Float32Array {
  let endIndex = samples.length - 1;
  while (endIndex > 0) {
    if (Math.abs(samples[endIndex]) > threshold) break;
    endIndex--;
  }
  return samples.slice(0, endIndex + 1);
}

// --- Downmix and resample helper ---
async function downmixAndResampleToMono(audioBuffer: AudioBuffer, targetSampleRate = 44100): Promise<AudioBuffer> {
  // Downmix to mono
  const length = audioBuffer.length;
  const mono = new Float32Array(length);
  if (audioBuffer.numberOfChannels === 1) {
    audioBuffer.copyFromChannel(mono, 0);
  } else {
    const left = audioBuffer.getChannelData(0);
    const right = audioBuffer.getChannelData(1);
    for (let i = 0; i < length; i++) {
      mono[i] = (left[i] + right[i]) / 2;
    }
  }
  // Resample using OfflineAudioContext
  const offlineCtx = new OfflineAudioContext(1, Math.ceil(audioBuffer.duration * targetSampleRate), targetSampleRate);
  const buffer = offlineCtx.createBuffer(1, mono.length, audioBuffer.sampleRate);
  buffer.copyToChannel(mono, 0);
  const source = offlineCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(offlineCtx.destination);
  source.start();
  const renderedBuffer = await offlineCtx.startRendering();
  // Trim trailing silence from the mono channel
  const renderedMono = renderedBuffer.getChannelData(0);
  const trimmedMono = trimTrailingSilence(renderedMono);
  // Create a new AudioBuffer with trimmed data
  const trimmedBuffer = new OfflineAudioContext(1, trimmedMono.length, renderedBuffer.sampleRate).createBuffer(1, trimmedMono.length, renderedBuffer.sampleRate);
  trimmedBuffer.copyToChannel(trimmedMono, 0);
  return trimmedBuffer;
}

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
    
    // Set specific options for MediaRecorder
    const options = { 
      mimeType: 'audio/webm;codecs=opus',
      audioBitsPerSecond: 128000
    };
    
    try {
      mediaRecorder = new MediaRecorder(micStream, options);
      console.log('MediaRecorder created with options:', options);
    } catch (e) {
      console.log('Failed to create MediaRecorder with these options, falling back to defaults');
      mediaRecorder = new MediaRecorder(micStream);
    }
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        console.log(`Received audio chunk of size: ${event.data.size} bytes`);
        audioChunks.push(event.data);
      }
    };
    mediaRecorder.onstop = async () => {
      try {
        if (!mediaRecorder) {
          throw new Error('MediaRecorder is not initialized');
        }
        // Get the MIME type from the recorder
        const mimeType = mediaRecorder.mimeType || 'audio/webm;codecs=opus';
        console.log('MediaRecorder MIME type:', mimeType);
        // Log the audio chunks we've collected
        console.log(`Number of audio chunks: ${audioChunks.length}`);
        console.log('Audio chunks:', audioChunks);
        // Create blob for both download and transcription
        const audioBlob = new Blob(audioChunks, { type: mimeType });
        console.log(`Total audio blob size: ${audioBlob.size} bytes`);
        // Convert recorded audio to mono, resample to 44100 Hz, and encode as WAV
        aiService.setLanguage('en');
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        const monoResampledBuffer = await downmixAndResampleToMono(audioBuffer, 44100);
        const wavBlob = encodeWAV(monoResampledBuffer);
        // Set up download link for WAV file
        const wavDownloadUrl = URL.createObjectURL(wavBlob);
        downloadLink!.href = wavDownloadUrl;
        downloadLink!.download = 'recorded_audio.wav';
        downloadLink!.style.display = 'block';
        // Verify the blob content
        const reader = new FileReader();
        reader.onload = () => console.log('WAV audio data verification:', reader.result ? 'Data present' : 'No data');
        reader.readAsArrayBuffer(wavBlob);
        // Transcribe
        const transcription = await aiService.transcribeAudio(wavBlob);
        console.log('Transcription:', transcription);
      } catch (error) {
        console.error('Failed to process audio:', error);
        if (error instanceof Error) {
          alert(`Error processing audio: ${error.message}`);
        } else {
          alert('Error processing audio. Please try again.');
        }
      }
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