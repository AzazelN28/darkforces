/** @module files/lev */
import dataViewUtils from 'utils/dataView'

/**
 * Parses a .LEV file.
 * @param {DataView} dataView
 * @param {number} start
 * @param {number} size
 */
export function parse(dataView, start, size) {
  const content = dataViewUtils.toString(dataView, start, size)
  const lines = content.split('\n')
  let state = 'version'
    , sectors = []
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]
  }
  return {}
}

/**
 * Parses a .LEV file from a directory entry
 * @param {DirectoryEntry} directoryEntry
 * @returns {LevelGeometry}
 */
export function parseEntry({ dataView, start, size }) {
  return parse(dataView, start, size)
}

export default {
  parse,
  parseEntry
}
