/** @module files/bm */
import dataViewUtils from 'utils/dataView'
import rle from 'utils/rle'
import pal from 'files/pal'
import { createParseEntry } from 'utils/parse'

/**
 * Enumeration of compression types.
 * @readonly
 * @enum {number}
 */
export const Compression = {
  /** Uncompressed */
  NONE: 0,
  /** Compressed using RLE0 */
  RLE0: 1,
  /** Compressed using RLE1 */
  RLE1: 2,
}

/**
 * Bitmap object.
 * @typedef {Object} Bitmap
 * @property {boolean} isAnimated - Always false
 * @property {number} width
 * @property {number} height
 * @property {number} offsetX
 * @property {number} offsetY
 * @property {number} transparent
 * @property {number} logSizeY
 * @property {number} compression
 * @property {number} bufferSize
 * @property {Uint8ClampedArray} buffer
 * @property {ImageData} imageData
 */

/**
 * Animated bitmap object.
 * @typedef {Object} AnimatedBitmap
 * @property {boolean} isAnimated - Always true
 * @property {number} frameRate - Frame rate
 * @property {number} width - Width
 * @property {number} height - Height
 * @property {number} offsetX - Offset X
 * @property {number} offsetY - Offset Y
 * @property {number} transparent - Transparent color
 * @property {number} logSizeY - ¿?
 * @property {number} compression - Compression type
 * @property {number} bufferSize - Buffer size
 * @property {Array<Bitmap>} buffers
 */

/**
 * Parses a .BM file from a DataView.
 *
 * @param {DataView} dataView
 * @param {number} start
 * @param {number} size
 * @returns {Bitmap|AnimatedBitmap}
 */
export function parse(dataView, start, size) { // eslint-disable-line
  const signature = dataViewUtils.getString(dataView, start, start + 4)
  if (signature !== 'BM\x20\x1E') {
    throw new Error('Invalid BM signature')
  }
  const width = dataView.getUint16(start + 4, true)
  const height = dataView.getUint16(start + 6, true)
  const offsetX = dataView.getUint16(start + 8, true)
  const offsetY = dataView.getUint16(start + 10, true)
  const transparent = dataView.getUint8(start + 12)
  const logSizeY = dataView.getUint8(start + 13)
  const compression = dataView.getUint16(start + 14, true)
  const bufferSize = dataView.getUint32(start + 16, true)
  if (width === 1 && height !== 1) {
    const frameRate = dataView.getUint8(start + 20)
    const magicNumber = dataView.getUint8(start + 21)
    console.log(magicNumber)
    if (magicNumber === 0x00) {
      console.warn('TODO: Implement BM with magicNumber 0')
      return {}
    }
    if (magicNumber !== 0x02) {
      throw new Error('Invalid magic number')
    }
    const offsets = []
    for (let index = 0; index < offsetY; index++) {
      offsets.push(start + dataView.getUint32(22 + (index * 4), true) + 34)
    }
    const buffers = []
    for (const offset in offsets) {
      const subWidth = dataView.getUint16(offset, true)
      const subHeight = dataView.getUint16(offset + 2, true)
      const subOffsetX = dataView.getUint16(offset + 4, true)
      const subOffsetY = dataView.getUint16(offset + 6, true)
      const subBufferSize = dataView.getUint32(offset + 8, true)
      const subLogSizeY = dataView.getUint8(offset + 12)
      const subTransparent = dataView.getUint8(offset + 24)
      const subBuffer = dataView.buffer.slice(offset + 28, offset + 28 + subBufferSize)
      buffers.push({
        isAnimated: false,
        width: subWidth,
        height: subHeight,
        offsetX: subOffsetX,
        offsetY: subOffsetY,
        logSizeY: subLogSizeY,
        transparent: subTransparent,
        bufferSize: subBufferSize,
        buffer: subBuffer,
        imageData: new ImageData(subWidth, subHeight)
      })
    }
    return {
      isAnimated: true,
      width,
      height,
      offsetX,
      offsetY,
      transparent,
      logSizeY,
      compression,
      frameRate,
      bufferSize,
      buffers
    }
  }
  if (compression) {
    const offsets = []
    for (let index = 0; index < width; index++) {
      const offset = dataView.getUint32(32 + (index * 4), true)
      offsets.push(start + offset)
    }
    return {
      isAnimated: false,
      width,
      height,
      offsetX,
      offsetY,
      transparent,
      logSizeY,
      compression,
      bufferSize,
      buffer: rle.decompress(new Uint8ClampedArray(dataView.buffer), height, offsets, compression - 1),
      imageData: new ImageData(width, height),
    }
  }
  return {
    isAnimated: false,
    width,
    height,
    offsetX,
    offsetY,
    transparent,
    logSizeY,
    compression,
    bufferSize,
    buffer: new Uint8ClampedArray(dataView.buffer.slice(start + 32, start + 32 + bufferSize)),
    imageData: new ImageData(width, height),
  }
}

/**
 * Parses a BM entry.
 * @function
 * @param {DirectoryEntry} entry
 * @returns {Bitmap}
 */
export const parseEntry = createParseEntry(parse)

/**
 * Uses the palette in this image.
 * @param {Bitmap} bitmap
 * @param {Palette} palette
 */
export function use(bitmap, palette) {
  if (bitmap.isAnimated) {
    console.warn('Trying to use an animated bitmap. This needs to be implemented') // eslint-disable-line
  }
  let bufferOffset = 0
  for (let x = 0; x < bitmap.width; x++) {
    for (let y = 0; y < bitmap.height; y++) {
      // We need to invert the Y because all the numbers are
      // upside-down.
      const iY = (bitmap.height - y - 1)
      const dataOffset = ((iY * bitmap.width) + x) * 4
      const paletteIndex = bitmap.buffer[bufferOffset]
      if (paletteIndex === 0) {
        pal.set(bitmap.imageData.data, dataOffset, 0, 0, 0, 0)
      } else {
        const paletteOffset = paletteIndex * 4
        pal.copy(bitmap.imageData.data, dataOffset, palette, paletteOffset)
      }
      bufferOffset++
    }
  }
  return bitmap
}

/**
 * Renders a .BM bitmap
 * @param {Bitmap} bitmap
 * @param {number} cx
 * @param {number} x
 * @param {number} y
 */
export function render(bitmap, cx, x = 0, y = 0) {
  cx.putImageData(bitmap.imageData, x, y)
}

export default {
  parse,
  parseEntry,
  use,
  render,
}
