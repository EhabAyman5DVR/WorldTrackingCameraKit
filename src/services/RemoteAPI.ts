import {
    bootstrapCameraKit,
    Injectable,
    remoteApiServicesFactory,
    RemoteApiService,
    RemoteApiRequest,
    RemoteApiRequestHandler,
} from "@snap/camera-kit";


const lensRemoteAPIHandler: RemoteApiService = {
    apiSpecId: 'ef701e4d-76a7-4097-a691-8c7d7236ca9a',

    getRequestHandler(request: RemoteApiRequest): RemoteApiRequestHandler | undefined {
        if (request.endpointId !== "button_pressed") return;

        console.log("REMOTE API :" + request.parameters.yourParameter);

        if (request.parameters.button_id === "12345") {
            console.log("button 12345 is pressed");
        } else if (request.parameters.button_id === "67890") {
            console.log("button 67890 is pressed");
        }

        return (reply) => {
            const response = `Button ${request.parameters.button_id} pressed successfully`;
            const encoder = new TextEncoder();
            const uint8Array = encoder.encode(response);
            reply({
                status: "success",
                metadata: { button_id: request.parameters.button_id },
                body: uint8Array.buffer,
            });
        };
    },
};

export const bootstrapCameraKitWithRemoteAPI = async () => {
    return await bootstrapCameraKit(
        {
            apiToken: 'eyJhbGciOiJIUzI1NiIsImtpZCI6IkNhbnZhc1MyU0hNQUNQcm9kIiwidHlwIjoiSldUIn0.eyJhdWQiOiJjYW52YXMtY2FudmFzYXBpIiwiaXNzIjoiY2FudmFzLXMyc3Rva2VuIiwibmJmIjoxNzMyNjE1MzY5LCJzdWIiOiI4NDY2ZTk1NS1mNWQxLTQ1MWUtYTFkYy0zN2YzZWJmODJlMjZ-U1RBR0lOR342OWRiMjFlOS05MzNjLTQ2M2EtOTFjZS1kZWQzMjNjNWU3MTUifQ.o0f-fIr0HpC-Mo0Gz16j83Z4D3SiCFoj7sGEs1_xF_Y',
            logger: "console",
        },
        (container) => {
            return container.provides(
                Injectable(
                    remoteApiServicesFactory.token,
                    [],
                    (existing) => [...existing, lensRemoteAPIHandler]
                )
            );
        }
    );
};