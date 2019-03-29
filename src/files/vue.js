/** @module files/vue */
import { createParseEntry } from 'utils/parse'

/**
 * Parses a .VUE file from a DataView.
 * @param {DataView} dataView
 * @param {snumber} start
 * @param {number} size
 */
export function parse(dataView, start, size) {
  return {}
}

/**
 * Parses a .VUE file from a DirectoryEntry
 * @function
 * @param {DirectoryEntry} directoryEntry
 */
export const parseEntry = createParseEntry(parse)

export default {
  parse,
  parseEntry,
}
