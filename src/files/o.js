import { createParseEntry } from 'utils/parse'

/** @module files/o */

/**
 * Parses a .O file from a DataView
 * @param {DataView} dataView
 * @param {number} start
 * @param {number} size
 */
export function parse(dataView, start, size) {

}

/**
 * Parses a .O file from a DirectoryEntry
 * @function
 * @param {DirectoryEntry} directoryEntry
 */
export const parseEntry = createParseEntry(parse)

export default {
  parse,
  parseEntry,
}
