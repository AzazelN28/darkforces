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

/*
export function face() {
  const target = transforms.get(ai.target)
  distance[0] = target.position[0] - transform.position[0]
  distance[1] = target.position[1] - transform.position[1]

  const d = Math.hypot(distance[0], distance[1])

  transform.velocity[0] = transform.direction[0] * 2
  transform.velocity[1] = transform.direction[1] * 2

  forward[0] = distance[0] / d
  forward[1] = distance[1] / d

  right[0] = transform.direction[1]
  right[1] = -transform.direction[0]

  const dot = forward[0] * right[0] + forward[1] * right[1]
  if (dot < 0.1) {
    transform.rotation += 0.025
  } else if (dot > 0.1) {
    transform.rotation -= 0.025
  }
}
*/

export default {
  radiansToDegrees,
  degreesToRadians
}
