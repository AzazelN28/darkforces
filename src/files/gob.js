/** @module files/gob */
import dataViewUtils from 'utils/dataView'

/**
 * A directory entry represents a file inside a .GOB file.
 * @typedef {Object} DirectoryEntry
 * @property {string} name - Name of the entry (uses the DOS convention 8 letters, a dot and 3 letters for extension)
 * @property {string} start - Offset in bytes of the entry
 * @property {string} size - Size in bytes of the entry
 * @property {DataView} dataView - DataView where you can find the entry
 */

/**
 * Returns an array of directory entries from the .GOB file.
 * @param {DataView} dataView - .GOB DataView
 * @returns {Array<DirectoryEntry>} - List of files inside the .GOB file
 */
export function parse(dataView) {
  const entries = []
  const signature = dataViewUtils.getString(dataView, 0, 4)
  if (signature !== 'GOB\x0a') {
    throw new Error('Invalid GOB header')
  }
  let offset = dataView.getUint32(4, true)
  const count = dataView.getUint32(offset, true)
  offset += 4
  for (let index = 0; index < count; index++) {
    const name = dataViewUtils.getNullString(dataView, offset + 8, offset + 21)
    const start = dataView.getUint32(offset, true)
    const size = dataView.getUint32(offset + 4, true)
    const entry = {
      start,
      size,
      name,
      dataView,
    }
    entries.push(entry)
    offset += 21
  }
  return entries
}

/**
 * Loads a .GOB file
 * @param {URL|string} url - Url to load
 * @returns {Promise<Array<DirectoryEntry>|Error>}
 */
export function load(url) {
  return fetch(url)
    .then(response => response.arrayBuffer())
    .then(arrayBuffer => new DataView(arrayBuffer))
    .then(dataView => parse(dataView))
}

/**
 * Loads multiple .GOB files
 * @param {...URL|string} urls - Urls to load
 * @returns {Promise<Array<DirectoryEntry>|Error>}
 */
export function loadAll(...urls) {
  return Promise
    .all(urls.map(load))
    .then((...entries) => {
      return entries.reduce((flattened, entries) =>
        flattened.concat(...entries),
      [])
    })
}

export default {
  parse,
  load,
  loadAll,
}
