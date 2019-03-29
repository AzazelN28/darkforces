/** @module files/msg */
import dataViewUtils from 'utils/dataView'
import { parseContent, parseLine } from 'utils/parse'

/**
 * Parses a .MSG file
 * @param {DataView} dataView
 * @param {number} start
 * @param {number} size
 */
export function parse(dataView, start, size) {
  const content = dataViewUtils.toString(dataView, start, size)
  let numMessages = 0
    , messages = []
  parseContent(content, 'version', {
    'version': (line) => {
      const [version] = parseLine('MSG {v}', line)
      if (version !== '1.0') {
        throw new Error('Invalid MSG version')
      }
      return 'message-count'
    },
    'message-count': (line) => {
      const [count] = parseLine('MSGS {n}', line)
      numMessages = count
      return 'message-entry'
    },
    'message-entry': (line) => {
      const [id,group,text] = parseLine(' {n} {n}: "{*}"', line)
      messages.push({ id, group, text })
      if (messages.length < numMessages) {
        return 'message-entry'
      }
    }
  })
  if (numMessages !== messages.length) {
    throw new Error('Invalid MSGS count')
  }
  return messages
}

/**
 * Parses a .MSG file from a DirectoryEntry
 * @param {DirectoryEntry} directoryEntry
 */
export function parseEntry({ dataView, start, size }) {
  return parse(dataView, start, size)
}

export default {
  parse,
  parseEntry,
}
