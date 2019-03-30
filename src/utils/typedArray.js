/**
 * Copies data from a Uint8 or Uint8ClampedArray to a Float32Array
 * @param {Uint8Array|Uint8ClampedArray} from - Source array
 * @returns {Float32Array}
 */
export function createFloat32FromUint8(from) {
  const to = new Float32Array(from.length)
  for (let i = 0; i < from.length; i++) {
    to[i] = (from[i] - 127) / 128
  }
  return to
}

/**
 * Returns a new TypedArray from multiple array buffers.
 * @param  {...ArrayBufferView} arrays
 * @returns {ArrayBufferView}
 */
export function from(...arrays) {
  const [first] = arrays
  const TypedArrayType = first.constructor
  let length = 0
  for (const array of arrays) {
    length += array.length
  }
  const concatenated = new TypedArrayType(length)
  let previous = null
  for (let index = 0; index < arrays.length; index++) {
    const current = arrays[index]
    concatenated.set(current, (previous && previous.length) || 0)
    previous = current
  }
  return concatenated
}

export default {
  createFloat32FromUint8,
  from
}
