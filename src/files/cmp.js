/** @module files/cmp */
import dataViewUtils from 'utils/dataView'
import { createParseEntry } from 'utils/parse'

/**
 * Number of colormaps (the last color map only has 128 entries instead of 256)
 * @private
 * @readonly
 * @type {number}
 */
const COLOR_MAPS = 32

/**
 * Number of colors inside a color map
 * @private
 * @readonly
 * @type {number}
 */
const COLOR_MAP_COLORS = 256

/**
 * Number of colors inside the last color map
 * @private
 * @readonly
 * @type {number}
 */
const COLOR_MAP_HALF_COLORS = 128

/**
 * Parses a .CMP file from a DataView
 * @param {DataView} DataView
 * @param {number} start
 * @param {number} size
 */
export function parse(dataView, start, size) {
  const colorMaps = []
  for (let index = 0; index <= COLOR_MAPS; index++) {
    const offset = start + (index * COLOR_MAP_COLORS)
    if (index === COLOR_MAPS) {
      colorMaps.push(dataViewUtils.getBytes(dataView, offset, offset + COLOR_MAP_HALF_COLORS))
    } else {
      colorMaps.push(dataViewUtils.getBytes(dataView, offset, offset + COLOR_MAP_COLORS))
    }
  }
  return colorMaps
}

/**
 * Parses a .CMP from a DirectoryEntry
 * @function
 * @param {DirectoryEntry} directoryEntry
 * @returns {ColorMap}
 */
export const parseEntry = createParseEntry(parse)

export default {
  parse,
  parseEntry,
}
