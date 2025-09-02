// @input Asset.RemoteServiceModule remoteServiceModule
//@input SceneObject testImg;

// Example of calling an endpoint in "lip-sync-trigger" API. Update with actual data.
script.createEvent("OnStartEvent").bind(()=>{
          //  script.testImg.enabled=false;
})

const req = RemoteServiceHttpRequest.create();
const host = "https://lip-sync-trigger.vercel.app/";
const endpoint = "api/lip-sync-trigger";
req.url = host + endpoint;
// Change to Post, Put, Delete, etc., as needed
req.method = RemoteServiceHttpRequest.HttpRequestMethod.Get;
req.headers = {
    // No headers needed for GET request by default
    // Uncomment and modify if using Post, Put, etc.
    // "Content-Type": "application/json"
};
// Add a request body if required for the chosen endpoint (only for Post, Put, etc.)
req.body = "";

script.remoteServiceModule.performHttpRequest(req, (res) => {
    if (res.statusCode === 200) {
        script.testImg.enabled=false;
        print("Success! Response body: " + res.body);
    } else if (res.statusCode === 400 && res.headers["x-camera-kit-error-type"]) {
        print("Client error (" + res.headers["x-camera-kit-error-type"] + "): " + res.body);
    } else {
        print("Error: Unexpected HTTP status code " + res.statusCode + ".");
    }
});
