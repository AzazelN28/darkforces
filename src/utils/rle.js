/** @module utils/rle */

/**
 * Enumeration of RLE versions implemented.
 * @readonly
 * @enum {number}
 */
export const Version = {
  RLE0: 0,
  RLE1: 1,
}

/**
 * Decompresses RLE columns using version 0
 * @param {Uint8ClampedArray} buffer
 * @param {number} width
 * @param {Array<number>} offsets
 * @returns {Uint8ClampedArray}
 */
export function rle1(buffer, width, offsets) {
  const output = []
  for (const offset of offsets) {
    let unpackedBytes = 0
    let currentOffset = offset
    while (unpackedBytes < width) {
      const controlByte = buffer[currentOffset]
      currentOffset++
      if (controlByte <= 128) {
        output.push(...buffer.slice(currentOffset, currentOffset + controlByte))
        currentOffset += controlByte
        unpackedBytes += controlByte
        continue
      }
      const value = buffer[currentOffset]
      currentOffset++
      output.push(...(new Uint8ClampedArray(controlByte - 128)).fill(value))
      unpackedBytes += controlByte - 128
    }
  }
  const decompressed = Uint8ClampedArray.from(output)
  if (decompressed.byteLength !== width * offsets.length) {
    throw new Error('Invalid decompressed data')
  }
  return decompressed
}

/**
 * Decompresses RLE columns using version 1
 * @param {Uint8ClampedArray} buffer - Buffer
 * @param {number} width - Width
 * @param {Array<number>} offsets - Offsets
 * @returns {Uint8ClampedArray}
 */
export function rle0(buffer, width, offsets) {
  const output = []
  for (const offset of offsets) {
    let unpackedBytes = 0
    let currentOffset = offset
    while (unpackedBytes < width) {
      const controlByte = buffer[currentOffset]
      currentOffset++
      if (controlByte <= 128) {
        output.push(...buffer.slice(currentOffset, currentOffset + controlByte))
        currentOffset += controlByte
        unpackedBytes += controlByte
        continue
      }
      output.push(...(new Uint8ClampedArray(controlByte - 128)).fill(0))
      unpackedBytes += controlByte - 128
    }
  }
  const decompressed = Uint8ClampedArray.from(output)
  if (decompressed.byteLength !== width * offsets.length) {
    throw new Error('Invalid decompressed data')
  }
  return decompressed
}

/**
 * Decompress RLE compressed bitmap
 * @param {Uint8ClampedArray} buffer - Buffer
 * @param {number} width - Width
 * @param {Array<number>} offsets - Offsets
 * @param {Version} [version=Version.RLE0]
 * @returns {Uint8ClampedArray}
 */
export function decompress(buffer, width, offsets, version = Version.RLE0) {
  if (version === Version.RLE0) {
    return rle0(buffer, width, offsets)
  }
  return rle1(buffer, width, offsets)
}

export default {
  Version,
  rle0,
  rle1,
  decompress,
}
