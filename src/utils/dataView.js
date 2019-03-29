/** @module utils/dataView */
import arrayBufferUtils from './arrayBuffer'

/**
 * Returns a string from the `start` to the `end`, if it is specified, otherwise
 * it reads until it finds a `null` termination character (0x00).
 *
 * @param {DataView} dataView - DataView
 * @param {number} start - Start offset
 * @param {number} [end=Infinity] - End offset
 * @returns {string} - Null terminated string
 */
export function getNullString(dataView, start, end = Infinity) {
  let string = ''
  let index = start
  let character = 0x00
  do {
    character = dataView.getUint8(index)
    if (character !== 0x00) {
      string += String.fromCharCode(character)
    }
    index++
  } while (character !== 0x00 && (end !== Infinity ? index < end : true))
  return string
}

/**
 * Returns a string from the `start` offset to `end` offset
 * of the `dataView`.
 *
 * @param {DataView} dataView - DataView
 * @param {number} start - Start offset
 * @param {number} end - End offset
 * @returns {string} - String
 */
export function getString(dataView, start, end) {
  let string = ''
  for (let index = start; index < end; index++) {
    string += String.fromCharCode(dataView.getUint8(index))
  }
  return string
}

/**
 * Returns a string from the dataView
 * @param {DataView} dataView
 * @param {number} [start=0]
 * @param {number} [size=dataView.byteLength]
 * @returns {string}
 */
export function toString(dataView, start = 0, size = dataView.byteLength) {
  return arrayBufferUtils.toString(dataView.buffer.slice(start, start + size))
}

/**
 * Returns a slice of bytes
 * @param {DataView} dataView
 * @param {number} start
 * @param {number} end
 * @returns {Uint8ClampedArray}
 */
export function getBytes(dataView, start, end) {
  return new Uint8ClampedArray(dataView.buffer.slice(start, end))
}

/**
 * Verifies that some bytes have a specified signature
 * @param {DataView} dataView
 * @param {number} start
 * @param {Array<number>} signature
 * @returns {boolean}
 */
export function verify(dataView, start, signature) {
  for (let index = start; index < start + signature.length; index++) {
    if (dataView.getUint8(index) !== signature[index - start]) {
      return false
    }
  }
  return true
}

export default {
  getBytes,
  getString,
  toString,
  getNullString,
  verify,
}
