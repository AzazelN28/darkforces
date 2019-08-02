import touch from './touch'
import TouchStick from './touch/TouchStick'

let isRunning = false

const leftStick = new TouchStick('#left-stick')
const rightStick = new TouchStick('#right-stick')

/**
 * Starts listening to events
 */
export function start() {
  if (isRunning) {
    return false
  }
  isRunning = true
  leftStick.start()
  rightStick.start()
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
  leftStick.stop()
  rightStick.stop()
  return true
}

/**
 * Returns if something is pressed.
 * @param {*} code
 * @param {*} threshold
 */
export function isPressed(code, threshold = 0.1) {
  switch (code) {
  case 'LeftStickLeft': return leftStick.value[0] < -threshold
  case 'LeftStickRight': return leftStick.value[0] > threshold
  case 'LeftStickUp': return leftStick.value[1] < -threshold
  case 'LeftStickDown': return leftStick.value[1] > threshold
  case 'RightStickLeft': return rightStick.value[0] < -threshold
  case 'RightStickRight': return rightStick.value[0] > threshold
  case 'RightStickUp': return rightStick.value[1] < -threshold
  case 'RightStickDown': return rightStick.value[1] > threshold
  }
}

export function isReleased(code, threshold = 0.1) {
  return !isPressed(code, threshold)
}

export default {
  start,
  stop,
  isPressed,
  isReleased,
  get leftStick() {
    return leftStick.value
  },
  get rightStick() {
    return rightStick.value
  }
}
