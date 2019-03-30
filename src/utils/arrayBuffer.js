/** @module utils/arrayBuffer */

/**
 * Returns an ArrayBuffer from a string
 * @param {string} string
 * @returns {ArrayBuffer}
 */
export function fromString(string) {
  const arrayBuffer = new ArrayBuffer(string.length)
  for (let index = 0; index < string.length; index++) {
    const charCode = string.charCodeAt(index)
    if (charCode >= 0 && charCode <= 0xFF) {
      arrayBuffer[index] = charCode
    }
  }
  return arrayBuffer
}

/**
 * Returns a string from an ArrayBuffer
 * @param {ArrayBuffer} arrayBuffer
 * @returns {string}
 */
export function toString(arrayBuffer) {
  const array = new Uint8Array(arrayBuffer)
  let string = ''
  for (let i = 0; i < array.length; i++) {
    string += String.fromCharCode(array[i])
  }
  return string
  //return String.fromCharCode.apply(null, new Uint8Array(arrayBuffer))
}

export default {
  toString,
  fromString,
}
