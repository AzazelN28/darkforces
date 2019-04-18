/** @module files/lvl */
import dataViewUtils from 'utils/dataView'
import { parseContent, parseLine } from '../utils/parse'

/**
 * Parses a .LVL file.
 * @param {DataView} dataView
 * @param {number} start
 * @param {number} size
 */
export function parse(dataView, start, size) {
  const content = dataViewUtils.toString(dataView, start, size)
  let levelCount
  const levels = []
  parseContent(content, 'count', {
    'count': (line) => {
      const [count] = parseLine('LEVELS {n}', line)
      levelCount = count
      return 'entries'
    },
    'entries': (line) => {
      const [levelName, levelFileName, levelPaths] = parseLine('{a}, {a}, {a}', line)
      levels.push({
        name: levelName,
        fileName: levelFileName,
        paths: levelPaths.split(';')
      })
      if (levels.length < levelCount) {
        return 'entries'
      }
    }
  })
  return levels
}

/**
 * Parses an entry.
 * @param {DirectoryEntry} entry
 * @returns {DirectoryEntry}
 */
export function parseEntry({ dataView, start, size }) {
  return parse(dataView, start, size)
}

export default {
  parse,
  parseEntry
}
