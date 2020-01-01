const fs = require('fs')

const BlockType = {
  END: 1,
  VIEW: 2,
  DELT: 3,
  ANIM: 3,
  CUST: 3,
  PLTT: 4,
  VOIC: 5
}

const CommandType = {
  UNKNOWN_1: 0,
  UNKNOWN_2: 1,
  END: 2,
  TIME: 3,
  MOVE: 4, /* (x, y, 0, 0) */
  SPEED: 5, /* (h, v, 0, 0) */
  LAYER: 6, /* (z) */
  FRAME: 7, /* (n, ?0?) */
  ANIMATE: 8, /* (dir, ?0?) */
  CUE: 9, /* (n) */
  VAR: 10, /* (n) */
  WINDOW: 11, /* (xmin, ymin, xmax, ymax) */
  UNKNOWN_3: 12,
  SWITCH: 13, /* (onoff) */
  UNKNOWN_4: 14,
  PALETTE: 15,
  UNKNOWN_5: 16,
  UNKNOWN_6: 17,
  CUT: 18, /* (c, t) */
  UNKNOWN_7: 19,
  LOOP: 20, /* (0) */
  UNKNOWN_8: 21,
  UNKNOWN_9: 22,
  UNKNOWN_10: 23,
  PRELOAD: 24,
  SOUND: 25, /* (onoff, volume, 0, 0) */
  UNKNOWN_11: 26,
  UNKNOWN_12: 27,
  STEREO: 28 /* (onoff, volume, 0, 0, panposition, 0, 0) */
}

const content = fs.readFileSync(process.argv[2])

const signature = content.readUInt16LE(0)
if (signature !== 0x04) {
  throw new Error('Invalid FILM signature')
}

const duration = content.readUInt16LE(2)
const numObjects = content.readUInt16LE(4)

let offset = 6
for (let objectIndex = 0; objectIndex < numObjects; objectIndex++) {
  const blockExtension = content.slice(offset, offset + 4).toString('ascii')
  const name = content.slice(offset + 4, offset + 12).toString('ascii')
  const blockTotalLength = content.readUInt32LE(offset + 12)
  const blockType = content.readUInt16LE(offset + 16)
  const numCommands = content.readUInt16LE(offset + 18)
  const blockLength = content.readUInt16LE(offset + 20)
  if (blockLength !== blockTotalLength - 22) {
    console.warn('BlockLength !== blockTotalLength - 22')
  }
  offset += 22
  for (let commandIndex = 0; commandIndex < numCommands; commandIndex++) {
    const commandLength = content.readUInt16LE(offset)
    const commandType = content.readUInt16LE(offset + 2)
    const numParameters = (commandLength - 4) / 2
    offset += 4
    for (let parameterIndex = 0; parameterIndex < numParameters; parameterIndex) {
      const parameter = content.readUInt16LE(offset)
      offset += 2
    }
  }
}
