import dataViewUtils from 'utils/dataViewUtils'
import { createParseEntry } from 'utils/parse'
import { parseContent, parseLine } from 'utils/parse'

/** @module files/o */

/**
 * Parses a .O file from a DataView
 * @param {DataView} dataView
 * @param {number} start
 * @param {number} size
 */
export function parse(dataView, start, size) {
  const content = dataViewUtils.toString(dataView, start, size)
  let levelName
    , podCount
    , pods = []
    , waxCount
    , waxs = []
    , fmeCount
    , fmes = []
    , vocCount
    , vocs = []
    , objectCount // eslint-disable-line
    , objects = [] // eslint-disable-line

  parseContent(content, 'version', {
    'version': (line) => {
      const [version] = parseLine('O {v}', line)
      if (version !== '1.1') {
        throw new Error('Invalid O file')
      }
      return 'level-name'
    },
    'level-name': (line) => {
      const [name] = parseLine('LEVELNAME {a}', line)
      levelName = name
      return 'pod-count'
    },
    'pod-count': (line) => {
      const [count] = parseLine('PODS {n}', line)
      podCount = count
      if (count === 0) {
        return 'wax-count'
      }
      return 'pod'
    },
    'pod': (line) => {
      const [name] = parseLine(' POD: {a}', line)
      pods.push(name)
      if (pods.length === podCount) {
        return 'wax-count'
      }
      return 'pod'
    },
    'wax-count': (line) => {
      const [count] = parseLine('SPRS {n}', line)
      waxCount = count
      if (count === 0) {
        return 'fme-count'
      }
      return 'wax'
    },
    'wax': (line) => {
      const [name] = parseLine(' SPR: {a}', line)
      waxs.push(name)
      if (waxs.length === waxCount) {
        return 'fme-count'
      }
      return 'wax'
    },
    'fme-count': (line) => {
      const [count] = parseLine('FMES {n}', line)
      fmeCount = count
      if (count === 0) {
        return 'voc-count'
      }
      return 'fme'
    },
    'fme': (line) => {
      const [name] = parseLine(' FME: {a}', line)
      fmes.push(name)
      if (fmes.length === fmeCount) {
        return 'sound-count'
      }
      return 'fme'
    },
    'voc-count': (line) => {
      const [count] = parseLine('SOUNDS {n}', line)
      vocCount = count
      if (count === 0) {
        return 'object-count'
      }
      return 'voc'
    },
    'voc': (line) => {
      const [name] = parseLine(' SOUND: {a}', line)
      vocs.push(name)
      if (vocs.length === vocCount) {
        return 'object-count'
      }
      return 'voc'
    },
    'object-count': (line) => {
      const [count] = parseLine('OBJECTS {n}', line)
      objectCount = count
      if (count === 0) {
        return
      }
      return 'object'
    },
    'object': (line) => { // eslint-disable-line
      // TODO: See how to parse the CLASS elements.
    }
  })
  return {
    levelName
  }
}

/**
 * Parses a .O file from a DirectoryEntry
 * @function
 * @param {DirectoryEntry} directoryEntry
 */
export const parseEntry = createParseEntry(parse)

export default {
  parse,
  parseEntry,
}
