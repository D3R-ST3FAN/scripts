// =====================================================
// Shelly WC Fan Controller
// MASTER DEVICE (Light Switch)
// -----------------------------------------------------
// Sends ON/OFF events to the slave device controlling
// the fan.
// Includes debounce and configurable repeated
// transmission for better reliability.
// =====================================================


// -------- USER CONFIGURATION --------

// IP address of the slave Shelly controlling the fan
let SLAVE_IP = "192.168.33.2";

// Ignore switch state changes that occur faster than this
// to avoid multiple events caused by switch/relay bounce
let EVENT_DEBOUNCE_MS = 300;

// Number of times each event is sent to the slave
// 1 = send once
// 2 = send twice
// 3 = send three times
let SEND_COUNT = 2;

// Delay between repeated sends
let SEND_REPEAT_DELAY_MS = 1000;


// -------- INTERNAL STATE --------

// Last known state of the master's relay output
let lastOutput = null;

// Timestamp of the last accepted event
let lastEventTimeMs = 0;


// -----------------------------------------------------
// Send an ON/OFF event to the slave via HTTP
// -----------------------------------------------------
function sendToSlave(isOn) {
  let url;

  if (isOn) {
    url = "http://" + SLAVE_IP + "/rpc/Script.Eval?code=masterEvent(true)";
  } else {
    url = "http://" + SLAVE_IP + "/rpc/Script.Eval?code=masterEvent(false)";
  }

  Shelly.call(
    "HTTP.GET",
    {
      url: url,
      timeout: 5
    },
    function (result, error_code, error_message) {
      if (error_code !== 0) {
        print("HTTP error:", error_code, error_message);
      }
    }
  );
}


// -----------------------------------------------------
// Send the same event multiple times for reliability
// -----------------------------------------------------
function sendRepeated(isOn) {
  let count = SEND_COUNT;

  if (count < 1) {
    count = 1;
  }

  let sent = 0;

  function doSend() {
    sendToSlave(isOn);
    sent += 1;

    if (sent < count) {
      Timer.set(SEND_REPEAT_DELAY_MS, false, doSend);
    }
  }

  doSend();
}


// -----------------------------------------------------
// Check whether the master's output state changed
// -----------------------------------------------------
function handlePossibleChange() {
  let st = Shelly.getComponentStatus("switch:0");

  if (!st || typeof st.output !== "boolean") {
    return;
  }

  // Initialize internal state on first startup
  if (lastOutput === null) {
    lastOutput = st.output;
    print("Initial state:", lastOutput ? "ON" : "OFF");
    return;
  }

  // Ignore if there is no actual change
  if (st.output === lastOutput) {
    return;
  }

  let now = Shelly.getUptimeMs();

  // Ignore events that happen too quickly after the last one
  if ((now - lastEventTimeMs) < EVENT_DEBOUNCE_MS) {
    print("Event ignored due to debounce");
    return;
  }

  lastEventTimeMs = now;
  lastOutput = st.output;

  print("Light changed:", lastOutput ? "ON" : "OFF");

  sendRepeated(lastOutput);
}


// -----------------------------------------------------
// Register a status handler so state changes are noticed
// -----------------------------------------------------
Shelly.addStatusHandler(function (event_data) {
  handlePossibleChange();
});


// -----------------------------------------------------
// Initial state check when the script starts
// -----------------------------------------------------
handlePossibleChange();

print("Master script started");
print("Configuration:");
print("SLAVE_IP =", SLAVE_IP);
print("EVENT_DEBOUNCE_MS =", EVENT_DEBOUNCE_MS);
print("SEND_COUNT =", SEND_COUNT);
print("SEND_REPEAT_DELAY_MS =", SEND_REPEAT_DELAY_MS);
