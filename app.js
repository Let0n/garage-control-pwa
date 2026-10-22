(() => {
"use strict";
const DEVICE_NAME = "Garage-ESP32-C3";
const SERVICE_UUID = "7b9a0001-1234-5678-1234-56789abcdef0";
const COMMAND_UUID = "7b9a0002-1234-5678-1234-56789abcdef0";
const COMMAND = "OPEN";
const button = document.getElementById("garageButton");
const status = document.getElementById("status");
let busy = false;
function setStatus(message) { status.textContent = message; }

async function findPreviouslyAuthorizedDevice() {
  if (!navigator.bluetooth || typeof navigator.bluetooth.getDevices !== "function") return null;
  try {
    const devices = await navigator.bluetooth.getDevices();
    return devices.find(device => device.name === DEVICE_NAME) || null;
  } catch (_) { return null; }
}

async function chooseDevice() {
  const remembered = await findPreviouslyAuthorizedDevice();
  if (remembered) return remembered;
  if (!navigator.bluetooth || typeof navigator.bluetooth.requestDevice !== "function") {
    throw new Error("Web Bluetooth is not available here. Open this page directly in Safari with Beacio enabled.");
  }
  return navigator.bluetooth.requestDevice({
    filters: [{ name: DEVICE_NAME }],
    optionalServices: [SERVICE_UUID]
  });
}

async function openCloseGarage() {
  if (busy) return;
  busy = true;
  button.disabled = true;
  try {
    setStatus("Looking for garage controller…");
    const device = await chooseDevice();
    if (!device.gatt) throw new Error("This device does not expose a GATT connection.");
    setStatus("Connecting…");
    const server = device.gatt.connected ? device.gatt : await device.gatt.connect();
    setStatus("Connecting to relay…");
    const service = await server.getPrimaryService(SERVICE_UUID);
    const characteristic = await service.getCharacteristic(COMMAND_UUID);
    setStatus("Sending garage command…");
    const bytes = new TextEncoder().encode(COMMAND);
    if (typeof characteristic.writeValueWithResponse === "function") {
      await characteristic.writeValueWithResponse(bytes);
    } else {
      await characteristic.writeValue(bytes);
    }
    setStatus("Command sent");
    try { device.gatt.disconnect(); } catch (_) {}
  } catch (error) {
    console.error(error);
    setStatus(error && error.message ? error.message : "Could not control the garage.");
  } finally {
    busy = false;
    button.disabled = false;
  }
}
button.addEventListener("click", openCloseGarage);
})();
