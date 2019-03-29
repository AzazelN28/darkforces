/** @module files/wax */
import dataViewUtils from 'utils/dataView'
import fme from 'files/fme'
import { createParseEntry } from 'utils/parse'

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
  const numSequences = dataView.getUint32(start + 4, true)
  const numFrames = dataView.getUint32(start + 8, true)
  const numCells = dataView.getUint32(start + 12, true)
  const scaleX = dataView.getUint32(start + 16, true)
  const scaleY = dataView.getUint32(start + 20, true)
  const unknown1 = dataView.getUint32(start + 24, true)
  const unknown2 = dataView.getUint32(start + 28, true)
  console.log(numSequences, numFrames, numCells, scaleX, scaleY, unknown1, unknown2)
  const states = []
  for (let i = 0; i < 32; i++) {
    const iOffset = start + 32 + (i * 4)
    const stateOffset = start + dataView.getUint32(iOffset, true)
    console.log(stateOffset)
    if (stateOffset === 0)
      continue

    const width = dataView.getUint32(stateOffset + 0, true)
    const height = dataView.getUint32(stateOffset + 4, true)
    const frameRate = dataView.getUint32(stateOffset + 8, true)
    const numFrames = dataView.getUint32(stateOffset + 12, true)
    const unknown3 = dataView.getUint32(stateOffset + 16, true)
    const unknown4 = dataView.getUint32(stateOffset + 20, true)
    const unknown5 = dataView.getUint32(stateOffset + 24, true)
    console.log(i, width, height, frameRate, numFrames, unknown3, unknown4, unknown5)
    const angles = []
    for (let j = 0; j < 32; j++) {
      const jOffset = stateOffset + 28 + (j * 4)
      const angleOffset = start + dataView.getUint32(jOffset, true)
      if (angleOffset === 0)
        continue

      const unknown6 = dataView.getUint32(angleOffset + 0, true)
      const unknown7 = dataView.getUint32(angleOffset + 4, true)
      const unknown8 = dataView.getUint32(angleOffset + 8, true)
      const unknown9 = dataView.getUint32(angleOffset + 12, true)
      const frames = []
      for (let k = 0; k < 32; k++) {
        const kOffset = angleOffset + 16 + (k * 4)
        const frameOffset = start + dataView.getUint32(kOffset, true)
        if (frameOffset === 0)
          continue

        frames.push({
          index: k
        })
        //frames.push(fme.parse(dataView, frameOffset))
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
    numSequences,
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

export default {
  parse,
  parseEntry,
}
