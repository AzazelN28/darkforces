import dataViewUtils from 'utils/dataView'
import fme from 'files/fme'
import { createParseEntry } from 'utils/parse'

/** @module files/wax */

/**
 * Sprite angle. This object contains information that represents a view angle
 * of a sprite.
 * @typedef {Object} SpriteAngle
 * @property {number} index
 * @property {number} offset
 * @property {number} unknown6
 * @property {number} unknown7
 * @property {number} unknown8
 * @property {number} unknown9
 * @property {Array<FME>} frames
 */

/**
 * Sprite state element
 * @typedef {Object} SpriteState
 * @property {number} index - State index
 * @property {number} width - Sprite width
 * @property {number} height - Sprite height
 * @property {number} frameRate - Frame rate
 * @property {number} numFrames - Number of frames in this state
 * @property {number} unknown3 - ?
 * @property {number} unknown4 - ?
 * @property {number} unknown5 - ?
 * @property {number} offset -
 * @property {Array<SpriteAngle>} angles
 */

/**
 * Sprite element
 * @typedef {Object} Sprite
 * @property {number} numStates - Number of states
 * @property {number} numFrames - Number of frames
 * @property {number} numCells - Number of angles
 * @property {number} scaleX - Scale X
 * @property {number} scaleY - Scale Y
 * @property {number} unknown1 - ?
 * @property {number} unknown2 - ?
 * @property {Array<SpriteState>} states
 */

/**
 * Maximum number of sprite states
 * @readonly
 * @type {number}
 */
const MAX_STATES = 32

/**
 * Maximum number of sprite frames
 * @readonly
 * @type {number}
 */
const MAX_FRAMES = 32

/**
 * Maximum number of sprite angles
 * @readonly
 * @type {number}
 */
const MAX_ANGLES = 32

/**
 * Sprite state names for enemy sprites.
 */
export const GeneralStateNames = [
  'walk',
  'attack',
  'die',
  'die-alt',
  'dead',
  'idle',
  'attack-follow',
  'attack-alt',
  'attack-follow-alt',
  'fly',
  'none',
  'none',
  'pain',
  'special'
]

export const RemoteStateNames = [
  'walk',
  'idle',
  'die',
  'die'
]

export const SceneryStateNames = [
  'idle',
  'dead'
]

export const BarrelStateNames = [
  'idle',
  'die'
]

/**
 * Parses a .WAX file from a DataView
 * @param {DataView} dataView
 * @param {number} start
 * @param {number} size
 * @return {Sprite}
 */
export function parse(dataView, start, size) { // eslint-disable-line
  if (!dataViewUtils.verify(dataView, start, [0x00, 0x10, 0x01, 0x00])
   && !dataViewUtils.verify(dataView, start, [0x00, 0x00, 0x01, 0x00])) {
    throw new Error('Invalid WAX signature')
  }
  const numStates = dataView.getInt32(start + 4, true)
  const numFrames = dataView.getInt32(start + 8, true)
  const numCells = dataView.getInt32(start + 12, true)
  const scaleX = dataView.getInt32(start + 16, true)
  const scaleY = dataView.getInt32(start + 20, true)
  const unknown1 = dataView.getInt32(start + 24, true)
  const unknown2 = dataView.getInt32(start + 28, true)
  const states = []
  for (let i = 0; i < MAX_STATES; i++) {
    const iOffset = start + 32 + (i * 4)
    const stateOffset = dataView.getInt32(iOffset, true)
    if (stateOffset === 0)
      continue

    const stateOffsetFromStart = start + stateOffset

    const width = dataView.getInt32(stateOffsetFromStart + 0, true)
    const height = dataView.getInt32(stateOffsetFromStart + 4, true)
    const frameRate = dataView.getInt32(stateOffsetFromStart + 8, true)
    const numFrames = dataView.getInt32(stateOffsetFromStart + 12, true)

    const unknown3 = dataView.getInt32(stateOffsetFromStart + 16, true)
    const unknown4 = dataView.getInt32(stateOffsetFromStart + 20, true)
    const unknown5 = dataView.getInt32(stateOffsetFromStart + 24, true)

    const angles = []
    for (let j = 0; j < MAX_ANGLES; j++) {
      const jOffset = stateOffsetFromStart + 28 + (j * 4)

      const angleOffset = dataView.getInt32(jOffset, true)
      if (angleOffset === 0)
        continue

      const angleOffsetFromStart = start + angleOffset

      const unknown6 = dataView.getInt32(angleOffsetFromStart + 0, true)
      const unknown7 = dataView.getInt32(angleOffsetFromStart + 4, true)
      const unknown8 = dataView.getInt32(angleOffsetFromStart + 8, true)
      const unknown9 = dataView.getInt32(angleOffsetFromStart + 12, true)

      const frames = []
      for (let k = 0; k < MAX_FRAMES; k++) {
        const kOffset = angleOffsetFromStart + 16 + (k * 4)

        const frameOffset = dataView.getInt32(kOffset, true)
        if (frameOffset === 0)
          continue

        const frameOffsetFromStart = start + frameOffset
        frames.push({
          index: k,
          fme: fme.parse(dataView, frameOffsetFromStart, undefined, { wax: { start } })
        })
      }
      angles.push({
        index: j,
        offset: angleOffset,
        unknown6,
        unknown7,
        unknown8,
        unknown9,
        frames
      })
    }
    states.push({
      index: i,
      width,
      height,
      frameRate,
      numFrames,
      unknown3,
      unknown4,
      unknown5,
      offset: stateOffset,
      angles
    })
  }
  return {
    numStates,
    numFrames,
    numCells,
    scaleX,
    scaleY,
    unknown1,
    unknown2,
    states
  }
}

/**
 * Parses a .WAX entry
 * @function
 * @param {DirectoryEntry} directoryEntry
 * @returns {Sprite}
 */
export const parseEntry = createParseEntry(parse)

/**
 * Applies the palette to the sprite
 * @param {Sprite} bitmap
 * @param {Palette} palette
 * @returns {Sprite}
 */
export function use(sprite, palette) {
  for (const state of sprite.states) {
    for (const angle of state.angles) {
      for (const frame of angle.frames) {
        fme.use(frame.fme, palette)
      }
    }
  }
  return sprite
}

export default {
  GeneralStateNames,
  RemoteStateNames,
  SceneryStateNames,
  BarrelStateNames,
  use,
  parse,
  parseEntry,
}
