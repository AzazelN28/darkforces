import touch from './touch'
import TouchHat from './touch/TouchHat'

let isRunning = false

const leftHat = new TouchHat('#left-hat')
const rightHat = new TouchHat('#right-hat')

/**
 * Starts listening to events
 */
export function start() {
  if (isRunning) {
    return false
  }
  isRunning = true
  leftHat.start()
  rightHat.start()
  return true
}

/**
 * Stops listening to events
 * @returns {boolean}
 */
export function stop() {
  if (!isRunning) {
    return false
  }
  isRunning = false
  leftHat.stop()
  rightHat.stop()
  return true
}

export default {
  start,
  stop,
  get leftAxis() {
    return leftHat.value
  },
  get rightAxis() {
    return rightHat.value
  }
}
