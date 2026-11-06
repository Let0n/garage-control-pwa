
(() => {
  "use strict";

  const DEVICE_NAME = "Garage-ESP32-C3";
  const SERVICE_UUID = "7b9a0001-1234-5678-1234-56789abcdef0";
  const COMMAND_UUID = "7b9a0002-1234-5678-1234-56789abcdef0";
  const COMMAND = "OPEN";

  const button = document.getElementById("garageButton");
  const status = document.getElementById("status");

  let busy = false;

  function setStatus(message) {
    status.textContent = message;
  }

  async function findPreviouslyAuthorizedDevice() {
    if (
      !navigator.bluetooth ||
      typeof navigator.bluetooth.getDevices !== "function"
    ) {
      return null;
    }

    try {
      const devices = await navigator.bluetooth.getDevices();
      return devices.find(device => device.name === DEVICE_NAME) || null;
    } catch (error) {
      console.warn("Could not retrieve authorized devices:", error);
      return null;
    }
  }

  async function chooseDevice() {
    const remembered = await findPreviouslyAuthorizedDevice();

    if (remembered) {
      return remembered;
    }

    if (
      !navigator.bluetooth ||
      typeof navigator.bluetooth.requestDevice !== "function"
    ) {
      throw new Error(
        "Web Bluetooth is unavailable. Open this page in Safari with Beacio enabled."
      );
    }

    return await navigator.bluetooth.requestDevice({
      filters: [{ name: DEVICE_NAME }],
      optionalServices: [SERVICE_UUID]
    });
  }

  async function sendCommand(device) {
    if (!device.gatt) {
      throw new Error("Device does not support GATT.");
    }

    setStatus("Connecting...");

    const server = device.gatt.connected
      ? device.gatt
      : await device.gatt.connect();

    setStatus("Finding relay...");

    const service = await server.getPrimaryService(SERVICE_UUID);
    const characteristic =
      await service.getCharacteristic(COMMAND_UUID);

    setStatus("Sending command...");

    const bytes = new TextEncoder().encode(COMMAND);

    if (
      typeof characteristic.writeValueWithResponse === "function"
    ) {
      await characteristic.writeValueWithResponse(bytes);
    } else {
      await characteristic.writeValue(bytes);
    }

    setStatus("Command sent!");

    try {
      device.gatt.disconnect();
    } catch (_) {}
  }

  async function openCloseGarage() {
    if (busy) return;

    busy = true;
    button.disabled = true;

    try {
      setStatus("Looking for garage controller...");

      const device = await chooseDevice();

      try {
        await sendCommand(device);
      } catch (error) {
        console.warn("Connection failed:", error);

        // If a remembered device fails, try the picker.
        if (
          !device ||
          typeof navigator.bluetooth.requestDevice !== "function"
        ) {
          throw error;
        }

        setStatus("Connection failed. Select ESP32 again...");

        const newDevice = await navigator.bluetooth.requestDevice({
          filters: [{ name: DEVICE_NAME }],
          optionalServices: [SERVICE_UUID]
        });

        await sendCommand(newDevice);
      }

    } catch (error) {
      console.error(error);

      setStatus(
        error && error.message
          ? error.message
          : "Could not control the garage."
      );

    } finally {
      busy = false;
      button.disabled = false;
    }
  }

  button.addEventListener("click", openCloseGarage);

})();
