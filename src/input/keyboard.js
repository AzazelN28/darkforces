import events from '../utils/events'

const eventTypes = [
  'keyup',
  'keydown'
]

let isRunning = false

const callbacks = new Map()
const keys = new Map()

/**
 * Listens to key presses
 * @param {KeyboardEvent} e
 */
function handler(e) {
  keys.set(e.code, e.type === 'keydown')
  if (callbacks.has(e.code)) {
    const callback = callbacks.get(e.code)
    callback(e)
  }
}

/**
 * Returns if a key code exists and if it is pressed
 * @param {string} code
 * @returns {boolean}
 */
export function stateOf(code) {
  return keys.has(code)
    ? keys.get(code)
    : false
}

/**
 * Returns a if a key is pressed.
 * @param {string} code - Key code (like 'ArrowUp')
 * @returns {boolean}
 */
export function isPressed(code) {
  return keys.get(code)
}

/**
 * Returns if a key is released.
 * @param {string} code
 * @returns {boolean}
 */
export function isReleased(code) {
  return !isPressed(code)
}

/**
 * Starts listening to the keyboard code
 * @param {string} code
 * @param {Function} callback
 */
export function on(code, callback) {
  callbacks.set(code, callback)
}

/**
 * Stops listening to the keyboard code
 * @param {string} code
 */
export function off(code) {
  callbacks.delete(code)
}

/**
 * Starts listening for keyboard events.
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
 * End listening for keyboard events.
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
  stateOf,
  isPressed,
  isReleased,
  on,
  off,
  start,
  stop
}
