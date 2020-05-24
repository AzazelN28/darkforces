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

/**
 * Returns a Base64 encoded data url string
 * @param {ArrayBuffer} arrayBuffer
 * @returns {string}
 */
export function toDataURL(arrayBuffer) {
  return new Promise((resolve, reject) => {
    const blob = new Blob([arrayBuffer], { type: 'application/octet-stream' })
    const reader = new FileReader()
    reader.onload = function () {
      return resolve(this.result)
    }
    reader.onerror = function () {
      return reject('error')
    }
    reader.onabort = function () {
      return reject('abort')
    }
    reader.readAsDataURL(blob)
  })
}

export default {
  toString,
  fromString,
  toDataURL
}
