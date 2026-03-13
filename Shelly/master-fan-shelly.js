// =====================================================
// Shelly WC Fan Controller
// MASTER DEVICE (Light Switch)
// -----------------------------------------------------
// Sends ON/OFF events to the slave device controlling
// the fan.
//
// Features:
// - debounce protection
// - configurable repeated transmission
// - HTTP RPC communication with slave
// =====================================================


// -------- USER CONFIGURATION --------

// IP address of the slave Shelly controlling the fan
let SLAVE_IP = "192.168.33.2";

// Script ID of the slave script containing masterEvent()
let SLAVE_SCRIPT_ID = 1;

// Ignore switch changes that occur faster than this
// to avoid relay or switch bounce
let EVENT_DEBOUNCE_MS = 300;

// Number of times the command is sent to the slave
// 1 = once, 2 = twice, 3 = three times, etc.
let SEND_COUNT = 2;

// Delay between repeated sends
let SEND_REPEAT_DELAY_MS = 1000;


// -------- INTERNAL STATE --------

let lastOutput = null;
let lastEventTimeMs = 0;


// -----------------------------------------------------
// Build the HTTP URL used to call Script.Eval on slave
// -----------------------------------------------------
function buildSlaveUrl(isOn) {

  let code;

  if (isOn) {
    code = "masterEvent(true)";
  } else {
    code = "masterEvent(false)";
  }

  return "http://" + SLAVE_IP +
    "/rpc/Script.Eval?id=" + SLAVE_SCRIPT_ID +
    "&code=" + code;
}


// -----------------------------------------------------
// Send event to slave via HTTP
// -----------------------------------------------------
function sendToSlave(isOn) {

  let url = buildSlaveUrl(isOn);

  Shelly.call(
    "HTTP.GET",
    {
      url: url,
      timeout: 5
    },
    function (result, error_code, error_message) {

      if (error_code !== 0) {
        print("HTTP error:", error_code, error_message);
        return;
      }

      if (result && typeof result.code !== "undefined") {
        print("HTTP status:", result.code);
      }

    }
  );

}


// -----------------------------------------------------
// Send event multiple times for reliability
// -----------------------------------------------------
function sendRepeated(isOn) {

  let count = SEND_COUNT;

  if (count < 1) {
    count = 1;
  }

  let sent = 0;

  function doSend() {

    sendToSlave(isOn);
    sent++;

    if (sent < count) {
      Timer.set(SEND_REPEAT_DELAY_MS, false, doSend);
    }

  }

  doSend();

}


// -----------------------------------------------------
// Detect relay state changes on master
// -----------------------------------------------------
function handlePossibleChange() {

  let st = Shelly.getComponentStatus("switch:0");

  if (!st || typeof st.output !== "boolean") {
    return;
  }

  if (lastOutput === null) {
    lastOutput = st.output;
    print("Initial state:", lastOutput ? "ON" : "OFF");
    return;
  }

  if (st.output === lastOutput) {
    return;
  }

  let now = Shelly.getUptimeMs();

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
// Register event listener for switch changes
// -----------------------------------------------------
Shelly.addStatusHandler(function (event_data) {
  handlePossibleChange();
});


// -----------------------------------------------------
// Initial check when script starts
// -----------------------------------------------------
handlePossibleChange();

print("Master script started");

print("Configuration:");
print("SLAVE_IP =", SLAVE_IP);
print("SLAVE_SCRIPT_ID =", SLAVE_SCRIPT_ID);
print("EVENT_DEBOUNCE_MS =", EVENT_DEBOUNCE_MS);
print("SEND_COUNT =", SEND_COUNT);
print("SEND_REPEAT_DELAY_MS =", SEND_REPEAT_DELAY_MS);
