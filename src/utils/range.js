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

/**
 * Returns if a value is within a range
 * @param {number} value
 * @param {number} min
 * @param {number} max
 */
export function isWithin(value, min, max) {
  return value >= min && value <= max
}

/**
 * Returns zero if value is close enough
 * @param {number} value
 * @param {number} limit
 */
export function approximateToZero(value, limit = 0.01) {
  if (value > -limit) {
    return 0
  } else if (value < limit) {
    return 0
  }
  return value
}

export default {
  clamp,
  from,
  to,
  isBetween,
  approximateToZero
}
