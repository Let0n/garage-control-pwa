'use strict';

// UUIDs and command match the supplied GarageControl Swift app.
const SERVICE_UUID = '7b9a0001-1234-5678-1234-56789abcdef0';
const COMMAND_UUID = '7b9a0002-1234-5678-1234-56789abcdef0';
const TIMEOUT_MS = 15000;

const button = document.getElementById('open');
const statusEl = document.getElementById('status');

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle('error', isError);
}

function withTimeout(promise, ms, message) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(message)), ms); })
  ]).finally(() => clearTimeout(timer));
}

async function openGarage() {
  if (!('bluetooth' in navigator) || !navigator.bluetooth?.requestDevice) {
    setStatus('Web Bluetooth is not available in this browser context. Open the page in Safari with Beacio enabled.', true);
    return;
  }

  button.disabled = true;
  let device;
  try {
    setStatus('Choose Garage ESP32 in the Bluetooth picker…');
    device = await navigator.bluetooth.requestDevice({ filters: [{ services: [SERVICE_UUID] }] });
    device.addEventListener('gattserverdisconnected', () => {
      // Disconnect is expected after sending the command.
    }, { once: true });

    setStatus('Connecting…');
    const server = await withTimeout(device.gatt.connect(), TIMEOUT_MS, 'Timed out connecting to Garage ESP32.');
    setStatus('Finding garage service…');
    const service = await server.getPrimaryService(SERVICE_UUID);
    setStatus('Finding command characteristic…');
    const characteristic = await service.getCharacteristic(COMMAND_UUID);
    setStatus('Sending OPEN…');
    const command = new TextEncoder().encode('OPEN');
    if (typeof characteristic.writeValueWithResponse === 'function') {
      await withTimeout(characteristic.writeValueWithResponse(command), TIMEOUT_MS, 'Timed out sending OPEN.');
    } else if (typeof characteristic.writeValue === 'function') {
      // Compatibility fallback for older Web Bluetooth implementations.
      await withTimeout(characteristic.writeValue(command), TIMEOUT_MS, 'Timed out sending OPEN.');
    } else {
      throw new Error('The command characteristic does not support writing.');
    }
    setStatus('OPEN command sent.');
  } catch (error) {
    const name = error?.name || '';
    let message = error?.message || 'Unknown Bluetooth error.';
    if (name === 'NotFoundError') message = 'No device selected. Try again and select Garage ESP32.';
    else if (name === 'SecurityError' || name === 'NotAllowedError') message = 'Bluetooth permission was not granted. Check Beacio/Safari permissions.';
    else if (name === 'NetworkError') message = 'Could not connect. Move closer to the ESP32 and try again.';
    setStatus(message, true);
  } finally {
    try { if (device?.gatt?.connected) device.gatt.disconnect(); } catch (_) {}
    button.disabled = false;
  }
}

button.addEventListener('click', openGarage);

if ('serviceWorker' in navigator && location.protocol.startsWith('https')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
