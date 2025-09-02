// In Lens Studio, add the Remote Service Module asset in the Resources panel
// and attach it via inspector to this script as 'remoteServiceModule'.

// Endpoint name as defined in your API spec
const ENDPOINT_NAME = "lip-sync-trigger";

// Function to handle the API response
function handleApiResponse(response) {
  if (response.statusCode !== 1) {
    print("API call failed: statusCode =", response.statusCode);
    return;
  }

  var body = JSON.parse(response.body);
  if (body.trigger) {
    startFakeLipSync(body.duration || 2.0);
  }
}

function pollTrigger() {
  var req = RemoteApiRequest.create();
  req.endpoint = ENDPOINT_NAME;
  script.remoteServiceModule.performApiRequest(req, function(response) {
    handleApiResponse(response);
  });
}

function startFakeLipSync(duration) {
  // Implement your mouth/jaw fake lip movement logic here
  print("Fake lipsync triggered for", duration, "seconds");
}

// Poll every 0.1 seconds (100 ms)
// Use an UpdateEvent to schedule polls
var timer = script.createEvent("UpdateEvent");
var elapsed = 0;
const POLL_INTERVAL = 0.1;

timer.bind(function(eventData) {
  elapsed += eventData.getDeltaTime();
  if (elapsed >= POLL_INTERVAL) {
    elapsed = 0;
    pollTrigger();
  }
});
