/** @module files/inf */
import dataViewUtils from 'utils/dataView'
import { createParseEntry } from 'utils/parse'
import { parseContent, parseLine } from '../utils/parse'

/**
 * Parses an INF file.
 * @param {DataView} dataView
 * @param {number} start
 * @param {NumberConstructor} size
 */
export function parse(dataView, start, size) {
  const content = dataViewUtils.toString(dataView, start, size)
  let levelName
    , itemCount
    , items = []
  parseContent(content, 'version', {
    'version': (line) => {
      const [version] = parseLine('INF {v}', line)
      if (version !== '1.0') {
        throw new Error('Invalid INF version')
      }
      return 'level-name'
    },
    'level-name': (line) => {
      const [name] = parseLine('LEVELNAME {a}', line)
      levelName = name
      return 'item-count'
    },
    'item-count': (line) => {
      const [count] = parseLine('ITEMS {n}', line)
      itemCount = count
      if (count === 0) {
        return
      }
      return 'item'
    },
    'item': (line) => { // eslint-disable-line

    }
  })
  return {
    name: levelName,
    itemCount,
    items
  }
}

export const parseEntry = createParseEntry(parse)

export default {
  parse,
  parseEntry,
}
