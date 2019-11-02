import events from '../utils/events'

const eventTypes = [
  'touchstart',
  'touchend',
  'touchcancel',
  'touchmove'
]

let isRunning = false

/**
 * Handles how the touch events are managed.
 * @param {TouchEvent} e
 */
function handler(e) {

}

/**
 * Starts listening to touch events
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
 * Stops listening to touch events
 */
export function stop() {
  if (isRunning) {
    return false
  }
  isRunning = true
  events.removeEventListeners(window, eventTypes, handler)
  return true
}

/**
 * Returns if the touch controls are available.
 * @returns {boolean}
 */
export function isEnabled() {
  try {
    document.createEvent('TouchEvent')
    return navigator.maxTouchPoints > 0
  } catch (e) {
    return false
  }
}

export default {
  start,
  stop,
  isEnabled,
}
