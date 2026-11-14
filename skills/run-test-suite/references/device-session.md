---
title: Device Session
description: How a runner picks an Android or iOS device, opens the app with agent-device, reads its build, takes evidence, and closes the session.
---

# Device Session

Mobile cases run with the `agent-device` skill: Android on a real device or an emulator, iOS on a simulator or a real iPhone.

## Tools

- Drive the app, read values, and take evidence only with `agent-device`. Read `agent-device help manual-qa` before the first command, `agent-device help physical-device` for a real device, and `agent-device help <command>` for exact flags.
- Other tools only read: `adb` on Android; `xcrun simctl`, `xcrun devicectl`, and `plutil` on iOS. Never drive the app with `adb shell input`, Appium, Maestro, or XCUITest scripts: refs, sessions, and evidence must all come from one driver.
- A platform's tool missing: that platform's cases are `blocked`, owner the user. The other platforms run on.

## Pick the Device

1. The device the user names: by name, Android serial, or iOS UDID.
2. The device the lesson file names for this environment.
3. `agent-device devices --platform <android|ios>` lists exactly one device: use it and add it to the lesson file.

Several devices and none named: ask the user once.

A real iPhone needs a one-time runner signing setup, described in `agent-device help physical-device`. Not set up: the iPhone's cases are `blocked`, owner the user. A simulator stands in only when the user agrees, since camera, push, and hardware behavior differ.

## Open the App

- Android: `agent-device open <package> --platform android --serial <serial> --session <app>-qa-android --foreground`.
- iOS: `agent-device open <bundle-id> --platform ios --udid <udid> --session <app>-qa-ios --foreground`.
- Add `--relaunch` when a case needs fresh app state.
- The app is missing or on the wrong build: install only a build the user gives, with `agent-device install <package-or-bundle-id> <path> --platform <android|ios>` plus `--serial` or `--udid`. Android takes an `.apk`, an iOS simulator an `.app`, an iPhone an `.ipa`.
- Check sign-in on the screen first. Signed out: ask the user to sign in on the device with that platform's account. `agent-device` has no credential vault, and passwords never go in commands.
- Keep the device's orientation, text size, display size, and appearance. Write the model, OS version, and orientation in the run description. A case that needs its own orientation, text size, or dark mode sets it with `agent-device orientation` or `agent-device settings`, and restores it after.

## Read the Build

| Device         | Command                                                                                                                                | Build                            |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| Android        | `adb -s <serial> shell dumpsys package <package>`                                                                                      | `<versionName> (<versionCode>)`  |
| iOS simulator  | `plutil -extract CFBundleShortVersionString raw "$(xcrun simctl get_app_container <udid> <bundle-id>)/Info.plist"`, again with `CFBundleVersion` | `<short version> (<version>)`    |
| iPhone         | `xcrun devicectl device info apps --device <udid> --bundle-id <bundle-id>`                                                             | `<version> (<bundle version>)`   |

Read it again after the app is reinstalled.

## Evidence

- Screenshots: `agent-device screenshot <run folder>/<file> --session <name>`. There is no full-page mode: scroll and add `C<id>-02.png`.
- Transient states: `agent-device record start <run folder>/C<id>-step<n>.mp4 --session <name>`, then `agent-device record stop --session <name>`.
- An element to judge from the screenshot: add `--crop-on <selector>`. It works on emulators, iOS simulators, and recent iPhones.

## Network

A case that needs to see the app's network traffic: use `agent-device network dump` when the app logs its traffic, else the proxy the lesson file names for this device. Neither works: `blocked` with "Needs a proxy to see network traffic on <device>", owner the user, unblocks when a proxy captures the app's traffic.

## Steps Only the User Can Do

Unlocking, biometrics on a real device, SIM or SMS steps, and anything physical: message the user as Step 3 of the skill says, and run other cases meanwhile. On an iOS simulator, `agent-device settings faceid match` or `touchid match` stands in for the user.

## Device Problems

| Problem                                         | What to do                                                                                      |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Android device not listed                       | Ask the user to plug a data cable straight into the computer, turn on USB debugging, and pick File transfer mode |
| `adb devices` shows `unauthorized`              | Ask the user to unlock the device and allow USB debugging for this computer                     |
| iPhone not listed                               | Ask the user to connect and unlock it, tap Trust, and turn on Developer Mode                    |
| Runner fails with a `signing_` reason, or `device_developer_mode_disabled` | Ask the user to finish the setup in `agent-device help physical-device`. The iPhone's cases wait |
| `offline`, or the device drops mid-run          | Ask the user to reconnect it. Rerun the interrupted case from its first step                   |
| `DEVICE_IN_USE`                                 | Check `agent-device session list`. Close the run's own leftover session; leave another job's and tell the user |
| Screen locks mid-run                            | Ask the user to unlock it, and to keep the screen awake while the run lasts                     |

## Close

`agent-device close --session <name>`. Add `--shutdown` when the run booted the emulator or simulator. Then check `agent-device session list` for leftovers, as Step 3 of the skill says.
