# Garage Control PWA (starter)

This is a first-pass web recreation of the supplied Swift app. It preserves the BLE UUIDs and sends the UTF-8 command `OPEN` to the command characteristic.

## Important iPhone / Beacio note

This starter is **not yet confirmed working with Beacio**. The app depends on Beacio exposing the standard Web Bluetooth API (`navigator.bluetooth`) to the page, including when installed to the Home Screen. Test in Safari with Beacio active before relying on it. If Beacio exposes a different API or does not support Home Screen web apps, this implementation will need adapting or the PWA approach may not work.

## Host and install

1. Host these files on an HTTPS site (for example, a static hosting provider). BLE requires a secure context; `localhost` is an exception for development.
2. Open the HTTPS URL in Safari on the iPhone, with Beacio enabled/configured.
3. Tap Share → Add to Home Screen.
4. Open it and tap **Open Garage**. Select the ESP32 device in the picker if prompted.
5. Test while near the receiver and verify the relay response before using it operationally.

The ESP32 does not need to join your home Wi-Fi. The phone must have Bluetooth enabled and be within BLE range. This PWA cannot provide the native app's Siri/Shortcuts App Intent.

## BLE protocol copied from the Swift project

- Service UUID: `7b9a0001-1234-5678-1234-56789abcdef0`
- Characteristic UUID: `7b9a0002-1234-5678-1234-56789abcdef0`
- Payload: UTF-8 `OPEN`
- Preferred write: write with response
- Connection timeout target: 15 seconds
