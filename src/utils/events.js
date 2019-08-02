/**
 * Adds multiple listeners.
 * @param {*} target
 * @param {Array<string>} types
 * @param {Function} listener
 */
export function addEventListeners(target, types, listener) {
  types.forEach(type => target.addEventListener(type, listener))
}

/**
 * Removes multiple listeners.
 * @param {*} target
 * @param {Array<string>} types
 * @param {Function} listener
 */
export function removeEventListeners(target, types, listener) {
  types.forEach(type => target.removeEventListener(type, listener))
}

export default {
  addEventListeners,
  removeEventListeners
}
