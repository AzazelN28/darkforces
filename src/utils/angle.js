/**
 * Constant to transform degrees to radians
 * @readonly
 * @type {number}
 */
const DEG_TO_RAD = Math.PI / 180

/**
 * Constant to transform radians to degrees
 * @readonly
 * @type {number}
 */
const RAD_TO_DEG = 180 / Math.PI

/**
 * Transforms degrees into radians
 * @param {number} degrees - Degrees
 * @returns {number} - Radians
 */
export function degreesToRadians(degrees) {
  return degrees * DEG_TO_RAD
}

/**
 * Transform radians into degrees
 * @param {number} radians - Radians
 * @returns {number} - Degrees
 */
export function radiansToDegrees(radians) {
  return radians * RAD_TO_DEG
}

export default {
  radiansToDegrees,
  degreesToRadians
}
