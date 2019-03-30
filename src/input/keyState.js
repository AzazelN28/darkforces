const keys = new Map()

/**
 * Listens to key presses
 * @param {*} e
 */
function handler(e) {
  keys.set(e.code, e.type === 'keydown')
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
 * Starts listening for keyboard events.
 */
export function start() {
  window.addEventListener('keydown', handler)
  window.addEventListener('keyup', handler)
}

/**
 * End listening for keyboard events.
 */
export function stop() {
  window.removeEventListener('keydown', handler)
  window.removeEventListener('keyup', handler)
}

export default {
  isPressed,
  isReleased,
  start,
  stop
}
