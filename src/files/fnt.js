/** @module files/fnt */
import dataViewUtils from 'utils/dataView'
import pal from 'files/pal'
import { createParseEntry } from 'utils/parse'

/**
 * Represents a font.
 * @typedef {Map<string, Glyph>} Font
 */

/**
 * Represents a font glyph.
 * @typedef {Object} Glyph
 * @property {number} width
 * @property {number} height
 * @property {ArrayBuffer} buffer
 */

/**
 * Returns a `Map` of font glyphs.
 * @param {DataView} dataView
 * @param {number} start
 * @param {number} size
 * @returns {Font}
 */
export function parse(dataView, start, size) {
  const signature = dataViewUtils.getString(dataView, start + 0, start + 4)
  if (signature !== 'FNT\x15') {
    throw new Error('Invalid FNT signature')
  }
  const height = dataView.getUint8(start + 4)
  const spacing = {
    glyph: dataView.getUint8(start + 5),
    x: dataView.getUint8(start + 6),
    y: dataView.getUint8(start + 7),
  }
  const range = {
    start: dataView.getUint8(start + 8),
    end: dataView.getUint8(start + 9)
  }
  const end = start + size
  const glyphs = []
  let offset = start + 32
  for (let index = range.start; index < range.end && offset < end; index++) {
    const width = dataView.getUint8(offset)
    offset++
    const buffer = new Uint8ClampedArray(dataView.buffer.slice(offset, offset + (width * height)))
    const imageData = new ImageData(width, height)
    glyphs.push([ String.fromCharCode(index), { width, height, buffer, imageData } ])
    offset += width * height
  }
  return {
    spacing,
    range,
    height,
    glyphs: new Map(glyphs)
  }
}

/**
 * Returns a parsed font from an entry.
 * @function
 * @param {DirectoryEntry} entry
 * @returns {Font}
 */
export const parseEntry = createParseEntry(parse)

/**
 * Returns a rendered palette glyphs.
 * @param {Font} font
 * @param {Palette} palette
 * @returns {Font}
 */
export function use(font, palette) {
  const { glyphs } = font
  for (const [, glyph] of glyphs) {
    const { width, height, imageData, buffer } = glyph
    let bufferOffset = 0
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        // We need to invert the Y because all the numbers are
        // upside-down.
        const iY = (height - y - 1)
        const dataOffset = ((iY * width) + x) * 4
        const paletteIndex = buffer[bufferOffset]
        if (paletteIndex === 0) {
          pal.set(imageData.data, dataOffset, 0, 0, 0, 0)
        } else {
          const paletteOffset = paletteIndex * 4
          //console.log(x,y,width,height,'dataOffset', dataOffset, 'bufferOffset', bufferOffset, 'paletteIndex', paletteIndex, 'paletteOffset', paletteOffset)
          pal.copy(imageData.data, dataOffset, palette, paletteOffset)
        }
        bufferOffset++
      }
    }
  }
  return font
}

/**
 * Renders a text using a font.
 * @param {Font} font - Font
 * @param {CanvasRenderingContext2D} cx - Context
 * @param {string} text - Text
 * @param {number} [x=0] - Coordinate x
 * @param {number} [y=0] - Coordinate y
 * @returns {CanvasRenderingContext2D}
 */
export function render(font, cx, text, x = 0, y = 0) {
  const { spacing, height, glyphs } = font
  let dx = x
  let dy = y
  for (let index = 0; index < text.length; index++) {
    const character = text.charAt(index)
    if (character === ' ') {
      dx += spacing.glyph + spacing.x
    } else if (character === '\n') {
      dx = x
      dy += height + spacing.y
    } else if (glyphs.has(character)) {
      const { width, imageData } = glyphs.get(character)
      cx.putImageData(imageData, dx, dy)
      dx += spacing.glyph + width
    }
  }
  return cx
}

export default {
  parse,
  parseEntry,
  use,
  render,
}
