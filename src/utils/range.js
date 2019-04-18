/**
 * Returns a value between `min` and `max`
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

/**
 * Returns a value between 0.0 and 1.0 for the specified range
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function from(value, min, max) {
  return (value - min) / (max - min)
}

/**
 * Returns a value between `min` and `max` if you pass a value between 0.0 and 1.0
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function to(value, min, max) {
  return min + (max - min) * value
}

/**
 * Returns if a value is between a range
 * @param {number} value
 * @param {number} min
 * @param {number} max
 */
export function isBetween(value, min, max) {
  return value > min && value < max
}

export default {
  clamp,
  from,
  to,
  isBetween
}
