/** @module files/gol */
import dataViewUtils from 'utils/dataView'
import { createParseEntry } from 'utils/parse'
import { parseContent, parseLine } from '../utils/parse'

/**
 * Parses a .GOL file
 * @param {DataView} dataView
 * @param {number} start
 * @param {number} size
 */
export function parse(dataView, start, size) {
  const content = dataViewUtils.toString(dataView, start, size)
  const entries = []
  parseContent(content, 'version', {
    'version': (line) => {
      const [version] = parseLine('GOL {v}', line)
      if (version !== '1.0') {
        throw new Error('Invalid GOL version')
      }
      return 'entries'
    },
    'entries': (line) => {
      const [goalNumber, goalType, goalTypeNumber] = parseLine('GOAL: {n} {(ITEM|TRIG)}: {n}', line)
      entries.push({
        id: goalNumber,
        type: [goalType, goalTypeNumber]
      })
    }
  })
  return entries
}

/**
 * Parses a .GOL file from a DirectoryEntry
 * @function
 * @param {DirectoryEntry} directoryEntry
 */
export const parseEntry = createParseEntry(parse)

export default {
  parse,
  parseEntry,
}
