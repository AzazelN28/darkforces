import events from '../utils/events'

const eventTypes = [
  'gamepadconnected',
  'gamepaddisconnected'
]

let isRunning = false
  , isEnabled = false
  , gamepads
  , leftStick = [0, 0]
  , rightStick = [0, 0]

/**
 * Handles how the gamepad is going to be managed when it is
 * connected or disconnected.
 * @param {GamepadEvent} e - Event
 */
function handler(e) {
  console.log(e)
}

/**
 * Updates gamepads list
 * @param {number} [time]
 */
export function update(time) {
  gamepads = navigator.getGamepads()
  for (const gamepad of gamepads) {
    if (gamepad && gamepad.connected) {
      leftStick[0] = gamepad.axes[0]
      leftStick[1] = gamepad.axes[1]
      rightStick[0] = gamepad.axes[3]
      rightStick[1] = gamepad.axes[4]
      isEnabled = true
    }
  }
}

/**
 * Starts listening for gamepad events
 */
export function start() {
  if (isRunning) {
    return false
  }
  isRunning = true
  events.addEventListeners(window, eventTypes, handler)
  return true
}

/**
 * Stops listening to gamepad events
 */
export function stop() {
  if (!isRunning) {
    return false
  }
  events.removeEventListeners(window, eventTypes, handler)
  isRunning = false
  return true
}

export function isButtonPressed(index) {
  for (const gamepad of gamepads) {
    if (gamepad && gamepad.connected) {
      if (gamepad.buttons[index].pressed) {
        return true
      }
    }
  }
  return false
}

export function isAxisPressed(index) {
  for (const gamepad of gamepads) {
    if (gamepad && gamepad.connected) {
      if (Math.abs(gamepad.axes[index]) > 0.5) {
        return true
      }
    }
  }
  return false
}

export function isPressed(name) {
  switch (name) {
  case 'LeftStickLeft': return leftStick[0] < -0.5
  case 'LeftStickRight': return leftStick[0] > 0.5
  case 'LeftStickUp': return leftStick[1] < -0.5
  case 'LeftStickDown': return leftStick[1] > 0.5
  case 'RightStickLeft': return rightStick[0] < -0.5
  case 'RightStickRight': return rightStick[0] > 0.5
  case 'RightStickUp': return rightStick[1] < -0.5
  case 'RightStickDown': return rightStick[1] > 0.5
  }
}

export function isReleased(name) {
  return !isPressed(name)
}

export default {
  start,
  update,
  stop,
  leftStick,
  rightStick,
  isPressed,
  isReleased,
  isEnabled() {
    return isEnabled
  }
}
