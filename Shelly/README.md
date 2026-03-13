# Shelly WC Fan Controller

This project implements a **master/slave control system** using two Shelly devices.

Typical use case:

* **Master**: light switch (Shelly 1 Mini Gen3 / Gen4)
* **Slave**: bathroom exhaust fan (Shelly 1 Mini Gen3 / Gen4)

The fan has **no internal timer** and only **L + N**, so the control logic is implemented using Shelly scripts.

---

# Behaviour

The system behaves as follows:

1. Light turns **ON**
2. After **2 minutes** the fan turns **ON**
3. Light turns **OFF**
4. Fan continues running for **5 minutes**
5. Maximum fan runtime is **60 minutes**

Additional safety features:

* **Debounce protection** to avoid switch bounce events
* **Configurable repeated transmission** of events from master to slave
* **Maximum runtime protection** to prevent the fan from running indefinitely

---

# Hardware

Tested with:

* Shelly 1 Mini Gen3
* Shelly 1 Mini Gen4

Other **Gen2 / Gen3 / Gen4 Shelly devices with a single relay** should also work.

---

# Fan Requirements

The fan must be a **simple fan without internal timer or humidity sensor**.

Typical wiring:

```
Fan
L → switched phase from Shelly
N → neutral
```

If the fan already has a **timer or humidity sensor**, this script is usually not required.

---

# Network Setup

The master communicates with the slave via **local HTTP RPC calls**.

Example configuration:

```
MASTER IP: 192.168.33.1
SLAVE IP:  192.168.33.2
```

---

# Peer-to-Peer Mode (No Home WiFi Required)

The system can run **completely without connecting to a home router**.

Example:

```
MASTER = WiFi Access Point
SLAVE  = WiFi Client
```

Configuration example:

MASTER:

```
Mode: Access Point
IP: 192.168.33.1
SSID: WC_Control
```

SLAVE:

```
Mode: Client
SSID: WC_Control
IP: 192.168.33.2
Gateway: 192.168.33.1
```

In this setup:

* the two Shelly devices communicate **directly**
* no home WiFi credentials are required
* the system works as a **small isolated control network**

This is useful when installing the system for someone else and you **do not want access to their home WiFi**.

---

# Installation

## 1. Install the Slave Script

Upload the file:

```
slave-fan-shelly.js
```

Enable:

```
Autostart = ON
```

Start the script.

---

## 2. Install the Master Script

Upload:

```
master-light-shelly.js
```

Edit the configuration section:

```
SLAVE_IP
```

Start the script.

---

# Adjustable Parameters

## Slave Script

```
ON_DELAY_MIN
OFF_DELAY_MIN
MAX_RUN_MIN
```

These control:

* fan start delay
* fan run-on time
* maximum fan runtime

---

## Master Script

```
EVENT_DEBOUNCE_MS
SEND_COUNT
SEND_REPEAT_DELAY_MS
```

These control:

* debounce filtering
* how often events are transmitted
* delay between repeated transmissions

---

# Manual Testing

You can manually trigger events from a browser.

Start the fan sequence:

```
http://SLAVE_IP/rpc/Script.Eval?code=masterEvent(true)
```

Stop the fan sequence:

```
http://SLAVE_IP/rpc/Script.Eval?code=masterEvent(false)
```

---

# Known Limitation

If the **slave reboots while the light is already ON**, the slave will not know the current state until the next light toggle event.

For typical bathroom usage this is usually acceptable.

---

# License

MIT
