import events from '../utils/events'
import { vec2 } from 'gl-matrix'

const MouseButtonName = {
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
  TERNARY: 'ternary',
  QUATERNARY: 'quaternary',
  QUINARY: 'quinary'
}

const MouseButtonFlag = {
  PRIMARY: 0x01,
  SECONDARY: 0x02,
  TERNARY: 0x04,
  QUATERNARY: 0x08,
  QUINARY: 0x10
}

const eventTypes = [
  'mouseup',
  'mousemove',
  'mousedown'
]

let isRunning = false

const buttons = new Map()
const coords = {
  current: vec2.create(),
  previous: vec2.create(),
  start: vec2.create(),
  end: vec2.create(),
  absolute: vec2.create(),
  relative: vec2.create(),
  movement: vec2.create()
}

/**
 * Listens to key presses
 * @param {KeyboardEvent} e
 */
function handler(e) {
  if (e.type === 'mousedown'
   || e.type === 'mouseup') {
    buttons.set(MouseButtonName.PRIMARY, e.type === 'mousedown' && e.buttons & MouseButtonFlag.PRIMARY)
    buttons.set(MouseButtonName.SECONDARY, e.type === 'mousedown' && e.buttons & MouseButtonFlag.SECONDARY)
    buttons.set(MouseButtonName.TERNARY, e.type === 'mousedown' && e.buttons & MouseButtonFlag.TERNARY)
    buttons.set(MouseButtonName.QUATERNARY, e.type === 'mousedown' && e.buttons & MouseButtonFlag.QUATERNARY)
    buttons.set(MouseButtonName.QUINARY, e.type === 'mousedown' && e.buttons & MouseButtonFlag.QUINARY)
    if (e.type === 'mousedown') {
      vec2.set(coords.start, e.clientX, e.clientY)
    } else {
      vec2.set(coords.end, e.clientX, e.clientY)
    }
  }

  if (e.type === 'mousemove') {
    vec2.set(coords.movement, e.movementX, e.movementY)
    vec2.copy(coords.previous, coords.current)
    vec2.set(coords.current, e.clientX, e.clientY)
    vec2.sub(coords.relative, coords.current, coords.previous)
    vec2.sub(coords.absolute, coords.start, coords.end)
  }
}

/**
 * Resets values
 */
export function update() {
  vec2.zero(coords.movement)
}

/**
 * Returns if a key code exists and if it is pressed
 * @param {string} code
 * @returns {boolean}
 */
export function stateOf(code) {
  return buttons.has(code) ?
    buttons.get(code) :
    false
}

/**
 * Returns a if a key is pressed.
 * @param {string} code - Key code (like 'ArrowUp')
 * @returns {boolean}
 */
export function isPressed(code) {
  return buttons.get(code)
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

/**
 * @returns {boolean}
 */
export function isLocked() {
  return !!document.pointerLockElement
}

/**
 * Bloqueamos el puntero
 * @param {Element} target - elemento que va a bloquear el puntero.
 */
export function lock(target) {
  return target.requestPointerLock()
}

/**
 * Desbloqueamos el puntero
 */
export function unlock() {
  return document.exitPointerLock()
}

export default {
  stateOf,
  isPressed,
  isReleased,
  start,
  update,
  stop,
  isLocked,
  lock,
  unlock,
  get coords() {
    return coords
  }
}
