/** @module files/fme */
import rle from 'utils/rle'
import { createParseEntry } from 'utils/parse'
import pal from 'files/pal'

/**
 * Parses an .FME file.
 * @param {DataView} dataView
 * @param {number} start
 * @param {number} size
 */
export function parse(dataView, start, size, { wax } = { wax: null }) { // eslint-disable-line
  const offsetX = dataView.getInt32(start + 0, true)
  const offsetY = dataView.getInt32(start + 4, true)
  const flip = dataView.getInt32(start + 8, true)
  const dataOffset = dataView.getInt32(start + 12, true)
  const unitWidth = dataView.getInt32(start + 16, true)
  const unitHeight = dataView.getInt32(start + 20, true)
  const unknown1 = dataView.getInt32(start + 24, true)
  const unknown2 = dataView.getInt32(start + 28, true)

  const dataOffsetFromStart = wax ? wax.start + dataOffset : start + dataOffset

  const width = dataView.getInt32(dataOffsetFromStart + 0, true)
  const height = dataView.getInt32(dataOffsetFromStart + 4, true)
  const compression = dataView.getInt32(dataOffsetFromStart + 8, true)
  const bufferSize = dataView.getInt32(dataOffsetFromStart + 12, true)
  const columnOffset = dataView.getInt32(dataOffsetFromStart + 16, true)
  const columnOffsetFromStart = start + columnOffset
  const unknown3 = dataView.getInt32(dataOffsetFromStart + 20, true)
  if (!compression) {
    const buffer = new Uint8ClampedArray(dataView.buffer.slice(dataOffsetFromStart + 24, dataOffsetFromStart + 24 + bufferSize))
    const imageData = new ImageData(width, height)
    return {
      unknown1,
      unknown2,
      unknown3,
      unitWidth,
      unitHeight,
      offsetX,
      offsetY,
      flip,
      dataOffset,
      dataOffsetFromStart,
      width,
      height,
      compression,
      bufferSize,
      buffer,
      imageData,
    }
  }

  const offsets = []
  for (let index = 0; index < width; index++) {
    offsets.push(dataOffsetFromStart + dataView.getInt32((wax ? dataOffsetFromStart + 24 : columnOffsetFromStart + 56) + (index * 4), true))
  }

  const buffer = rle.decompress(
    new Uint8ClampedArray(dataView.buffer),
    height,
    offsets,
    rle.Version.RLE0,
  )
  const imageData = new ImageData(width, height)
  return {
    unknown1,
    unknown2,
    unknown3,
    unitWidth,
    unitHeight,
    offsetX,
    offsetY,
    flip,
    dataOffset,
    dataOffsetFromStart,
    width,
    height,
    compression,
    bufferSize,
    buffer,
    imageData,
  }
}

/**
 * Parses an .FME entry.
 * @function
 * @param {DirectoryEntry} directoryEntry
 * @returns {}
 */
export const parseEntry = createParseEntry(parse)

/**
 * Applies the palette to the bitmap
 * @param {Bitmap} bitmap
 * @param {Palette} palette
 * @returns {Bitmap}
 */
export function use(bitmap, palette) {
  let bufferOffset = 0
  for (let x = 0; x < bitmap.width; x++) {
    for (let y = 0; y < bitmap.height; y++) {
      // We need to invert the Y because all the numbers are
      // upside-down.
      const iY = (bitmap.height - y - 1)
      const dataOffset = bitmap.flip ? ((iY * bitmap.width) + (bitmap.width - x)) * 4 : ((iY * bitmap.width) + x) * 4
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
 * Renders an .FME bitmap
 * @param {Bitmap} bitmap
 * @param {number} cx
 * @param {number} x
 * @param {number} y
 */
export function render(bitmap, cx, x = 0, y = 0) {
  cx.putImageData(bitmap.imageData, x + bitmap.offsetX, y + bitmap.offsetY)
}

export default {
  parse,
  parseEntry,
  use,
  render,
}
