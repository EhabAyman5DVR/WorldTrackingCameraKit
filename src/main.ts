
import {
    bootstrapCameraKit,
    CameraKitSession,
    createMediaStreamSource,
    Transform2D,
    Lens
} from '@snap/camera-kit';

let mediaStream: MediaStream;
let mediaRecorder: MediaRecorder;
let downloadUrl: string;
const videoContainer = document.getElementById(
    'video-container'
) as HTMLElement;

const videoTarget = document.getElementById('video') as HTMLVideoElement;

const startRecordingButton = document.getElementById(
    'start'
) as HTMLButtonElement;
const stopRecordingButton = document.getElementById(
    'stop'
) as HTMLButtonElement;
const downloadButton = document.getElementById('download') as HTMLButtonElement;
const liveRenderTarget = document.getElementById(
    'canvas'
) as HTMLCanvasElement;

async function init() {
    const cameraKit = await bootstrapCameraKit({ apiToken: 'eyJhbGciOiJIUzI1NiIsImtpZCI6IkNhbnZhc1MyU0hNQUNQcm9kIiwidHlwIjoiSldUIn0.eyJhdWQiOiJjYW52YXMtY2FudmFzYXBpIiwiaXNzIjoiY2FudmFzLXMyc3Rva2VuIiwibmJmIjoxNzUyNDkyMzM3LCJzdWIiOiJlMDA1YTEzMy1jNmNlLTRmNmUtYjMyMC05YTNkYzVjOTRlZTN-U1RBR0lOR35mZjZkOGU3OC0xZWYzLTQ3ZWUtOGY0ZC1lM2Y5MDZjOTZlZTEifQ.yf7OFtk9dhdjq8FsmXghKNea_7GMoBF01AGEpTVj6ZY' });
    const session = await cameraKit.createSession({ liveRenderTarget });
    const { lenses } = await cameraKit.lensRepository.loadLensGroups([
        'c352182f-89be-4007-b24c-8fcf50c56d56'
    ]);

    session.applyLens(lenses[0]);

    await setCameraKitSource(session, "0");

    attachCamerasToSelect(session);
    attachLensesToSelect(lenses, session);
}

async function setCameraKitSource(
    session: CameraKitSession,
    deviceId?: string
) {
    if (mediaStream) {
        session.pause();
        mediaStream.getVideoTracks()[0].stop();
    }

    if (deviceId != "-1" && deviceId != "-2" && deviceId != "-3") {
        mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId },
        });

        const source = createMediaStreamSource(mediaStream);

        await session.setSource(source);

        source.setTransform(Transform2D.MirrorX);
    }


    session.play();
    bindRecorder();
}

async function attachCamerasToSelect(session: CameraKitSession) {
    const cameraSelect = document.getElementById('cameras') as HTMLSelectElement;
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter(({ kind }) => kind === 'videoinput');


    cameras.forEach((camera) => {
        const option = document.createElement('option');

        option.value = camera.deviceId;
        option.text = camera.label;

        cameraSelect.appendChild(option);
    });

    cameraSelect.addEventListener('change', (event) => {
        const deviceId = (event.target as HTMLSelectElement).selectedOptions[0]
            .value;

        setCameraKitSource(session, deviceId);
    });
}

async function attachLensesToSelect(lenses: Lens[], session: CameraKitSession) {
    const lensSelect = document.getElementById('lenses') as HTMLSelectElement;

    lenses.forEach((lens) => {
        const option = document.createElement('option');

        option.value = lens.id;
        option.text = lens.name;

        lensSelect.appendChild(option);
    });

    lensSelect.addEventListener('change', (event) => {
        const lensId = (event.target as HTMLSelectElement).selectedOptions[0].value;
        const lens = lenses.find((lens) => lens.id === lensId);

        if (lens) session.applyLens(lens);
    });
}
async function bindRecorder() {
    startRecordingButton.addEventListener('click', () => {
        startRecordingButton.disabled = true;
        stopRecordingButton.disabled = false;
        downloadButton.disabled = true;
        videoContainer.style.display = 'none';

        const mediaStream = liveRenderTarget.captureStream(30);

        mediaRecorder = new MediaRecorder(mediaStream);
        mediaRecorder.addEventListener('dataavailable', (event) => {
            if (!event.data.size) {
                console.warn('No recorded data available');
                return;
            }

            const blob = new Blob([event.data]);

            downloadUrl = window.URL.createObjectURL(blob);
            downloadButton.disabled = false;

            videoTarget.src = downloadUrl;
            videoContainer.style.display = 'block';
        });

        mediaRecorder.start();
    });

    stopRecordingButton.addEventListener('click', () => {
        startRecordingButton.disabled = false;
        stopRecordingButton.disabled = true;

        mediaRecorder?.stop();
    });

    downloadButton.addEventListener('click', () => {
        const link = document.createElement('a');

        link.setAttribute('style', 'display: none');
        link.href = downloadUrl;
        link.download = 'camera-kit-web-recording.webm';
        link.click();
        link.remove();
    });
}

init();