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
export function parse(dataView, start, size) { // eslint-disable-line
  const offsetX = dataView.getUint32(start + 0, true)
  const offsetY = dataView.getUint32(start + 4, true)
  const flip = dataView.getUint32(start + 8, true)
  const dataOffset = start + dataView.getUint32(start + 12, true)
  const unitWidth = dataView.getUint32(start + 16, true)
  const unitHeight = dataView.getUint32(start + 20, true)

  const width = dataView.getUint32(dataOffset + 0, true)
  const height = dataView.getUint32(dataOffset + 4, true)
  const compression = dataView.getUint32(dataOffset + 8, true)
  const bufferSize = dataView.getUint32(dataOffset + 12, true)
  const columnOffset = start + dataView.getUint32(dataOffset + 16, true)

  if (!compression) {
    const buffer = new Uint8ClampedArray(dataView.buffer.slice(dataOffset + 20, dataOffset + 20 + bufferSize))
    const imageData = new ImageData(width, height)
    return {
      unitWidth,
      unitHeight,
      offsetX,
      offsetY,
      flip,
      dataOffset,
      columnOffset,
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
    offsets.push(dataOffset + dataView.getUint32(columnOffset + 56 + (index * 4), true))
  }

  const buffer = rle.decompress(
    new Uint8ClampedArray(dataView.buffer),
    height,
    offsets,
    rle.Version.RLE0,
  )
  const imageData = new ImageData(width, height)
  return {
    unitWidth,
    unitHeight,
    offsetX,
    offsetY,
    flip,
    dataOffset,
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
      const dataOffset = ((iY * bitmap.width) + x) * 4
      const paletteIndex = bitmap.buffer[bufferOffset]
      if (paletteIndex === 0) {
        pal.set(bitmap.imageData.data, dataOffset, 0, 0, 0, 0)
      } else {
        const paletteOffset = paletteIndex * 4
        //console.log(x,y,width,height,'dataOffset', dataOffset, 'bufferOffset', bufferOffset, 'paletteIndex', paletteIndex, 'paletteOffset', paletteOffset)
        pal.copy(bitmap.imageData.data, dataOffset, palette, paletteOffset)
      }
      bufferOffset++
    }
  }
}

/**
 * Renders an .FME bitmap
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
