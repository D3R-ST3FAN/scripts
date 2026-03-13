// =====================================================
// Shelly WC Fan Controller
// SLAVE DEVICE (Fan)
// -----------------------------------------------------
// Receives ON/OFF events from the master device.
// Implements:
//
// - start delay
// - run-on delay
// - maximum runtime protection
//
// Designed for simple fans with only L + N.
// =====================================================


// -------- USER CONFIGURATION --------

// Fan starts only if the light stays ON this long
let ON_DELAY_MIN = 2;

// Fan continues running for this long after light OFF
let OFF_DELAY_MIN = 5;

// Maximum allowed fan runtime
let MAX_RUN_MIN = 60;


// -------- TIME CONVERSIONS --------

let ON_DELAY_MS = ON_DELAY_MIN * 60 * 1000;
let OFF_DELAY_MS = OFF_DELAY_MIN * 60 * 1000;
let MAX_RUN_MS = MAX_RUN_MIN * 60 * 1000;


// -------- INTERNAL STATE --------

// Current known state of the master light
let masterIsOn = false;

// Timer handles
let onTimer = null;
let offTimer = null;
let maxRunTimer = null;

// Indicates that the maximum runtime was reached.
// While this is true, the fan must not restart until
// the master goes OFF once.
let maxRuntimeReached = false;


// -----------------------------------------------------
// Read current fan output state
// -----------------------------------------------------
function fanIsOn() {
  let st = Shelly.getComponentStatus("switch:0");
  return !!(st && st.output === true);
}


// -----------------------------------------------------
// Turn fan ON or OFF
// -----------------------------------------------------
function setFan(on) {
  Shelly.call(
    "Switch.Set",
    { id: 0, on: on },
    function (result, error_code, error_message) {
      if (error_code !== 0) {
        print("Switch.Set error:", error_code, error_message);
      }
    }
  );
}


// -----------------------------------------------------
// Helper functions to clear timers safely
// -----------------------------------------------------
function clearOnTimer() {
  if (onTimer !== null) {
    Timer.clear(onTimer);
    onTimer = null;
  }
}

function clearOffTimer() {
  if (offTimer !== null) {
    Timer.clear(offTimer);
    offTimer = null;
  }
}

function clearMaxRunTimer() {
  if (maxRunTimer !== null) {
    Timer.clear(maxRunTimer);
    maxRunTimer = null;
  }
}


// -----------------------------------------------------
// Start the maximum runtime timer
// If this timer expires, the fan is turned OFF and
// cannot restart until the master goes OFF once.
// -----------------------------------------------------
function startMaxRunTimer() {
  clearMaxRunTimer();

  maxRunTimer = Timer.set(MAX_RUN_MS, false, function () {
    maxRunTimer = null;

    print("Maximum runtime reached -> fan OFF until master goes OFF");
    maxRuntimeReached = true;

    clearOnTimer();
    clearOffTimer();

    if (fanIsOn()) {
      setFan(false);
    }
  });
}


// -----------------------------------------------------
// Start delay before turning the fan ON
// -----------------------------------------------------
function startOnDelay() {
  clearOnTimer();

  onTimer = Timer.set(ON_DELAY_MS, false, function () {
    onTimer = null;

    if (!masterIsOn) {
      print("Start delay expired but master is OFF");
      return;
    }

    if (maxRuntimeReached) {
      print("Fan start prevented because maximum runtime was reached");
      return;
    }

    if (!fanIsOn()) {
      print("Start delay reached -> fan ON");
      setFan(true);
      startMaxRunTimer();
    }
  });
}


// -----------------------------------------------------
// Start run-on timer after the light turns OFF
// -----------------------------------------------------
function startOffDelay() {
  clearOffTimer();

  offTimer = Timer.set(OFF_DELAY_MS, false, function () {
    offTimer = null;

    if (masterIsOn) {
      print("Run-on expired but master is ON again");
      return;
    }

    if (fanIsOn()) {
      print("Run-on finished -> fan OFF");
      setFan(false);
    }

    clearMaxRunTimer();
  });
}


// -----------------------------------------------------
// Receive event from the master device
// true  = master/light ON
// false = master/light OFF
// -----------------------------------------------------
function masterEvent(isOn) {
  if (isOn) {
    print("Master event: ON");

    masterIsOn = true;

    // If a run-on timer is active, cancel it because
    // the light is ON again
    clearOffTimer();

    // If the maximum runtime was already reached during
    // this light cycle, do not allow fan restart
    if (maxRuntimeReached) {
      print("Fan restart prevented because maximum runtime was reached");
      return true;
    }

    // Start delayed fan activation only if the fan
    // is currently OFF
    if (!fanIsOn()) {
      startOnDelay();
    }

    return true;
  }

  print("Master event: OFF");

  masterIsOn = false;

  // Master OFF resets the max runtime block for the next cycle
  maxRuntimeReached = false;

  // If light turns OFF before on-delay finished,
  // cancel the delayed start
  clearOnTimer();

  // If the fan is still running, start run-on timer
  if (fanIsOn()) {
    startOffDelay();
  }

  return true;
}


// -----------------------------------------------------
// Script startup information
// -----------------------------------------------------
print("Fan controller script started");
print("Configuration:");
print("ON_DELAY_MIN =", ON_DELAY_MIN);
print("OFF_DELAY_MIN =", OFF_DELAY_MIN);
print("MAX_RUN_MIN =", MAX_RUN_MIN);
