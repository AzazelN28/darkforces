/** @module files/gmd */
import dataViewUtils from 'utils/dataView'
import { createParseEntry } from 'utils/parse'

/**
 * Parses a .GMD file from a DataView.
 * @param {DataView} dataView
 * @param {number} start
 * @param {number} size
 */
export function parse(dataView, start, size) {
  const signature = dataViewUtils.getString(dataView, start + 0, start + 4)
  if (signature !== 'MIDI') {
    throw new Error('Invalid GMD signature')
  }
  const length = dataView.getUint32(start + 4)
  console.log(length)
  const unknown = dataViewUtils.getString(dataView, start + 4, start + 8)
  if (unknown !== 'MDpg') {
    throw new Error('Invalid GMD unknown signature')
  }
  const unknownLength = dataView.getUint32(start + 8)
  console.log(unknownLength)
  const data = dataView.buffer.slice(start + 12 + unknownLength)
  return {
    length,
    unknownLength,
    data
  }
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
