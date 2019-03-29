/** @module files/pal */

/**
 * Represents a palette color
 * @typedef {Array} Color
 * @property {number} 0 - Red channel
 * @property {number} 1 - Green channel
 * @property {number} 2 - Blue channel
 * @property {number} 3 - Alpha channel
 */

/**
 * Represents a palette
 * @typedef {Uint8ClampedArray} Palette
 */

/**
 * Returns a valid palette buffer
 * @param {DataView} dataView - DataView
 * @param {number} start - Start
 * @param {number} size - Size
 * @returns {Palette}
 */
export function parse(dataView, start, size) {
  if (size !== 768) {
    throw new Error('Invalid PAL size')
  }
  const palette = new Uint8ClampedArray(256 * 4)
  for (let index = 0; index < 256; index++) {
    const src = start + (index * 3)
    const dest = (index * 4)
    palette[dest + 0] = dataView.getUint8(src + 0) * 4
    palette[dest + 1] = dataView.getUint8(src + 1) * 4
    palette[dest + 2] = dataView.getUint8(src + 2) * 4
    palette[dest + 3] = 0xFF
  }
  return palette
}

/**
 * Parses a palette from a directory entry
 * @param {DirectoryEntry} entry
 * @returns {Palette}
 */
export function parseEntry({ dataView, start, size }) {
  return parse(dataView, start, size)
}

/**
 * Returns a palette color as a Color
 * @param {Palette} palette - Palette colors
 * @param {number} colorIndex - A number within 0 and 255
 * @param {Color} [out=[0,0,0,0]] - Color array used to output values
 * @returns {Color} - Palette color
 */
export function get(palette, colorIndex, out = [0, 0, 0, 0]) {
  const index = colorIndex * 4
  out[0] = palette[index + 0]
  out[1] = palette[index + 1]
  out[2] = palette[index + 2]
  out[3] = palette[index + 3]
  return out
}

/**
 * Resolves indexed color images to a rgba image
 * @param {Uint8ClampedArray} to - Destination
 * @param {number} toOffset - Destination offset
 * @param {Uint8ClampedArray} from - Source
 * @param {number} fromOffset - Source offset
 * @returns {Uint8ClampedArray}
 */
export function copy(to, toOffset, from, fromOffset) {
  to[toOffset + 0] = from[fromOffset + 0]
  to[toOffset + 1] = from[fromOffset + 1]
  to[toOffset + 2] = from[fromOffset + 2]
  to[toOffset + 3] = from[fromOffset + 3]
  return to
}

/**
 * Sets a color inside a buffer
 * @param {Uint8ClampedArray} to
 * @param {number} toOffset
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @param {number} a
 * @returns {Uint8ClampedArray}
 */
export function set(to, toOffset, r, g, b, a) {
  to[toOffset + 0] = r
  to[toOffset + 1] = g
  to[toOffset + 2] = b
  to[toOffset + 3] = a
  return to
}

/**
 * Returns a valid CSS palette color
 * @example
 * document.body.style.backgroundColor = pal.rgb(color) // returns `rgb(r,g,b)`
 * @param {Uint8ClampedArray} palette - Palette colors
 * @param {number} colorIndex - A number within 0 and 255
 * @returns {string} - Palette color
 */
export function rgb(palette, colorIndex) {
  const [r, g, b] = get(palette, colorIndex)
  return `rgb(${r},${g},${b})`
}

/**
 * Returns a valid CSS palette color
 * @example
 * document.body.style.backgroundColor = pal.rgba(color) // returns `rgba(r,g,b,a)`
 * @param {Uint8ClampedArray} palette - Palette colors
 * @param {number} colorIndex - A number within 0 and 255
 * @returns {string} - Palette color
 */
export function rgba(palette, colorIndex) {
  const [r, g, b, a] = get(palette, colorIndex)
  return `rgba(${r},${g},${b},${a})`
}

export default {
  parse,
  parseEntry,
  get,
  set,
  copy,
  rgb,
  rgba,
}
