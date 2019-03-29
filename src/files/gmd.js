/** @module files/gmd */
import { createParseEntry } from 'utils/parse'

/**
 * Parses a .GMD file from a DataView.
 * @param {DataView} dataView
 * @param {number} start
 * @param {number} size
 */
export function parse(dataView, start, size) {
  return {}
}

/**
 * Parses a .GMD file from a directory entry.
 * @function
 * @param {DirectoryEntry} directoryEntry
 */
export const parseEntry = createParseEntry(parse)

export default {
  parse,
  parseEntry
}
