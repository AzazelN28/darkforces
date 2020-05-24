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
  console.log(signature, signature === 'MIDI')
  if (signature !== 'MIDI') {
    throw new Error('Invalid GMD signature')
  }
  const length = dataView.getUint32(start + 4)
  console.log(length)
  const mdpgSignature = dataViewUtils.getString(dataView, start + 8, start + 12)
  if (mdpgSignature !== 'MDpg') {
    throw new Error('Invalid GMD unknown signature')
  }
  const mdpgLength = dataView.getUint32(start + 12)
  console.log(mdpgLength)
  const data = dataView.buffer.slice(start + 16 + mdpgLength, start + size)
  return {
    length,
    mdpgLength,
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
