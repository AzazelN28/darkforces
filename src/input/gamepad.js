import events from '../utils/events'

const eventTypes = [
  'gamepadconnected',
  'gamepaddisconnected'
]

let isRunning = false

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
 */
export function update() {
  const gamepads = navigator.getGamepads()
  console.log(update)
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

export default {
  start,
  update,
  stop
}
