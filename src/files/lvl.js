/** @module files/lvl */
import dataViewUtils from 'utils/dataView'

/**
 * Parses a .LVL file.
 * @param {DataView} dataView
 * @param {number} start
 * @param {number} size
 */
export function parse(dataView, start, size) {
  const content = dataViewUtils.toString(dataView, start, size)
  const lines = content.split('\n')
  let numLevels = 0
    , numLevel = 0
    , state = 'count'
  const levels = []
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]
    if (state === 'count') {
      const matches = line.match(/^LEVELS\s+([0-9]+)\s*$/)
      if (matches) {
        const [, count] = matches
        numLevels = parseInt(count, 10)
        state = 'entries'
      }
    } else if (state === 'entries') {
      if (numLevel < numLevels) {
        const matches = line.match(/^(.*?),\s+(.*?),\s+(.*?)\s*$/m)
        if (matches) {
          numLevel++
          const [, levelName, levelFileName, levelPaths] = matches
          levels.push({
            name: levelName,
            fileName: levelFileName,
            paths: levelPaths.split(';')
          })
        }
      }
    }
  }
  if (numLevels !== levels.length) {
    throw new Error(`Invalid LVL count (${numLevels} != ${levels.length})`)
  }
  return levels
}

export function parseEntry({ dataView, start, size }) {
  return parse(dataView, start, size)
}

export default {
  parse,
  parseEntry
}
