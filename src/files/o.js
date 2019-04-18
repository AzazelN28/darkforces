import dataViewUtils from 'utils/dataView'
import { createParseEntry } from 'utils/parse'
import { parseContent, parseLine } from 'utils/parse'
import { isLine } from '../utils/parse';

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
    , spriteCount
    , sprites = []
    , frameCount
    , frames = []
    , soundCount
    , sounds = []
    , objectCount
    , objects = []
    , object
    , isObjectSequence = false

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
      spriteCount = count
      if (count === 0) {
        return 'fme-count'
      }
      return 'wax'
    },
    'wax': (line) => {
      const [name] = parseLine(' SPR: {a}', line)
      sprites.push(name)
      if (sprites.length === spriteCount) {
        return 'fme-count'
      }
      return 'wax'
    },
    'fme-count': (line) => {
      const [count] = parseLine('FMES {n}', line)
      frameCount = count
      if (count === 0) {
        return 'voc-count'
      }
      return 'fme'
    },
    'fme': (line) => {
      const [name] = parseLine(' FME: {a}', line)
      frames.push(name)
      if (frames.length === frameCount) {
        return 'voc-count'
      }
      return 'fme'
    },
    'voc-count': (line) => {
      const [count] = parseLine('SOUNDS {n}', line)
      soundCount = count
      if (count === 0) {
        return 'object-count'
      }
      return 'voc'
    },
    'voc': (line) => {
      const [name] = parseLine(' SOUND: {a}', line)
      sounds.push(name)
      if (sounds.length === soundCount) {
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
      if (isLine('CLASS: {*} DATA: {i} X: {d} Y: {d} Z: {d} PCH: {d} YAW: {d} ROL: {d} DIFF: {i}', line) && !isObjectSequence) {
        const [className, data, x, y, z, pitch, yaw, roll, diff] = parseLine('CLASS: {*} DATA: {i} X: {d} Y: {d} Z: {d} PCH: {d} YAW: {d} ROL: {d} DIFF: {i}', line)
        object = {
          className: className.toLowerCase().trim(),
          data,
          x,
          y,
          z,
          pitch,
          yaw,
          roll,
          diff,
          typeName: null,
          vue: null,
          radius: 0,
          height: 0,
          eye: false,
          pause: false,
          logics: [],
          flags: null
        }
      } else if (isLine(' SEQ', line) && !isObjectSequence) {
        isObjectSequence = true
      } else if (isLine(' SEQEND', line) && isObjectSequence) {
        objects.push(object)
        object = null
        isObjectSequence = false
        if (objects.length === objectCount) {
          return
        }
      } else if (isLine(' LOGIC: {**}', line) && isObjectSequence) {
        const [logic] = parseLine(' LOGIC: {**}', line)
        object.logics.push(logic.trim())
      } else if (isLine(' EYE: {b}', line) && isObjectSequence) {
        const [eye] = parseLine(' EYE: {b}', line)
        object.eye = eye
      } else if (isLine(' FLAGS: {n}', line) && isObjectSequence) {
        const [flags] = parseLine(' FLAGS: {b}', line)
        object.flags = flags
      } else if (isLine(' TYPE: {**}', line) && isObjectSequence) {
        const [typeName] = parseLine(' TYPE: {**}', line)
        object.typeName = typeName.trim()
      } else if (isLine(' RADIUS: {d}', line) && isObjectSequence) {
        const [radius] = parseLine(' RADIUS: {d}', line)
        object.radius = radius
      } else if (isLine(' HEIGHT: {d}', line) && isObjectSequence) {
        const [height] = parseLine(' HEIGHT: {d}', line)
        object.height = height
      } else if (isLine(' PAUSE: {b}', line) && isObjectSequence) {
        const [pause] = parseLine('PAUSE: {b}', line)
        object.pause = pause
      } else if (isLine(' VUE: {*} {*}', line) && isObjectSequence) {
        const [vue, id] = parseLine('VUE: {*} {*}', line)
        object.vue = [vue, id]
      }
      return 'object'
    }
  })
  return {
    name: levelName,
    pods,
    podCount,
    sprites,
    spriteCount,
    frames,
    frameCount,
    sounds,
    soundCount,
    objects,
    objectCount
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
