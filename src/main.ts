
import {
    bootstrapCameraKit,
    CameraKitSession,
    createMediaStreamSource,
    Transform2D,
} from '@snap/camera-kit';

let mediaStream: MediaStream;


const liveRenderTarget = document.getElementById(
    'canvas'
) as HTMLCanvasElement;

async function init() {
    const cameraKit = await bootstrapCameraKit({ apiToken: 'eyJhbGciOiJIUzI1NiIsImtpZCI6IkNhbnZhc1MyU0hNQUNQcm9kIiwidHlwIjoiSldUIn0.eyJhdWQiOiJjYW52YXMtY2FudmFzYXBpIiwiaXNzIjoiY2FudmFzLXMyc3Rva2VuIiwibmJmIjoxNzUyNDkyMzM3LCJzdWIiOiJlMDA1YTEzMy1jNmNlLTRmNmUtYjMyMC05YTNkYzVjOTRlZTN-U1RBR0lOR35mZjZkOGU3OC0xZWYzLTQ3ZWUtOGY0ZC1lM2Y5MDZjOTZlZTEifQ.yf7OFtk9dhdjq8FsmXghKNea_7GMoBF01AGEpTVj6ZY' });
    const session = await cameraKit.createSession({ liveRenderTarget });
    const  lenses  = await cameraKit.lensRepository.loadLens('9ed04b81-fe59-4f95-8fc5-2592d96f847e',
        'c352182f-89be-4007-b24c-8fcf50c56d56'
    );

    session.applyLens(lenses);

    await setCameraKitSource(session);

}

async function setCameraKitSource(
    session: CameraKitSession) {
   
        mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" }
        });

        const source = createMediaStreamSource(mediaStream,{cameraType:'environment'});

        await session.setSource(source);

        source.setTransform(Transform2D.MirrorX);
    


    session.play();
}



init();