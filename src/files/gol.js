/** @module files/gol */
import dataViewUtils from 'utils/dataView'
import { createParseEntry } from 'utils/parse'

/**
 * Parses a .GOL file
 * @param {DataView} dataView
 * @param {number} start
 * @param {number} size
 */
export function parse(dataView, start, size) {
  const content = dataViewUtils.toString(dataView, start, size)
  const lines = content.split('\n')
  let state = 'version'
    , version = 0
  const entries = []
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]
    if (state === 'version') {
      const matches = line.match(/^GOL\s+([0-9]+\.[0-9]+)\s*$/)
      if (matches) {
        const [, versionString] = matches
        version = versionString
        if (version !== '1.0') {
          throw new Error('Invalid GOL version')
        }
        state = 'entries'
      }
    } else if (state === 'entries') {
      const matches = line.match(/^\s*GOAL:\s+([0-9]+)\s+(ITEM|TRIG):\s+([0-9]+)/)
      if (matches) {
        const [, goalNumber, goalType, goalTypeNumber] = matches
        console.log(goalNumber, goalType, goalTypeNumber)
        entries.push({
          id: goalNumber,
          type: [goalType, goalTypeNumber]
        })
      }
    }
  }
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
