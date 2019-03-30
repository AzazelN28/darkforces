/** @module files/voc */
import dataViewUtils from 'utils/dataView'
import typedArray from 'utils/typedArray'
import { createParseEntry } from 'utils/parse'

/**
 * Returns the sample rate from a frequency divisor.
 * @private
 * @param {number} frequencyDivisor
 * @returns {number}
 */
function getSampleRateFromFrequencyDivisor(frequencyDivisor) {
  return 1000000 / (256 - frequencyDivisor)
}

/**
 * Returns the sample rate from a number of channels and a frequency divisor.
 * @private
 * @param {number} numChannels
 * @param {number} frequencyDivisor
 * @returns {number}
 */
function getSampleRateFromNumChannelsFrequencyDivisor(numChannels, frequencyDivisor) {
  return 256000000 / (numChannels * (65536 - frequencyDivisor))
}

/**
 * Enumerates the available Codecs
 * @readonly
 * @enum {number}
 */
export const Codec = {
  /** This is right now the only supported codec. Unsigned 8 bit values */
  UNSIGNED_PCM_8: 0x00,
  /** 4 bits to 8 bits Creative ADPCM */
  ADPCM_4_8: 0x01,
  /** 3 bits to 8 bits Creative ADPCM (AKA 2.6 bits) */
  ADPCM_3_8: 0x02,
  /** 2 bits to 8 bits Creative ADPCM */
  ADPCM_2_8: 0x03,
  /** 16 bits signed PCM */
  SIGNED_PCM_16: 0x04,
  /** Logarithmic PCM (using A-Law) */
  ALAW: 0x06,
  /** Logarithmic PCM (using mU-Law) */
  ULAW: 0x07,
  /** 4 bits to 16 bits Creative ADPCM (only valid in block type 0x09 BlockType.SOUND_DATA_NF) */
  ADPCM_4_16: 0x2000
}

/**
 * Enumerates the block types supported by .VOC files
 * @readonly
 * @enum {number}
 */
export const BlockType = {
  /** Ends the .VOC file */
  TERMINATOR: 0x00,
  /** Contains sound data */
  SOUND_DATA: 0x01,
  /** Contains more sound data */
  SOUND_DATA_CONTINUATION: 0x02,
  /** Contains silence */
  SILENCE: 0x03,
  /** Multipurpose marker */
  MARKER: 0x04,
  /** Text marker */
  TEXT: 0x05,
  /** Specifies that the next sound data blocks needs to be repeated N times (or infinitely) */
  REPEAT_START: 0x06,
  /** Specifies that the loop ends */
  REPEAT_END: 0x07,
  /** Specifies extra info about codecs, sampleRate, etc. overrides any BlockType.SOUND_DATA info */
  EXTRA_INFO: 0x08,
  /** Contains sound data in a new way */
  SOUND_DATA_NF: 0x09 // New format
}

/**
 * Parses a .VOC file
 * @param {DataView} dataView
 * @param {number} start
 * @param {number} size
 */
export function parse(dataView, start, size) {
  const signature = dataViewUtils.getString(dataView, start, start + 19)
  const signatureTermination = dataView.getUint8(start + 19)
  if (signature !== 'Creative Voice File' || signatureTermination !== 0x1A) {
    throw new Error('Invalid VOC signature')
  }
  const headerSize = dataView.getUint16(start + 20, true)
  if (headerSize !== 0x1A) {
    throw new Error('Invalid VOC header size')
  }
  const minor = dataView.getUint8(start + 22)
  const major = dataView.getUint8(start + 23)
  const version = (major << 8) | minor
  const validityMark = dataView.getUint16(start + 24, true)
  const validityCheck = ~version + 0x1234
  if (validityMark !== validityCheck) {
    throw new Error('Invalid VOC validity mark')
  }
  let offset = start + 26
  const end = start + size
  const blocks = []
  while (offset < end) {
    const blockType = dataView.getUint8(offset)
    const blockSize = dataView.getUint8(offset + 1)
                    | dataView.getUint8(offset + 2) << 8
                    | dataView.getUint8(offset + 3) << 16
    if (blockType === BlockType.TERMINATOR) {
      // Este bloque está vacío
      break
    } else if (blockType === BlockType.SOUND_DATA) {
      const frequencyDivisor = dataView.getUint8(offset + 4)
      const codec = dataView.getUint8(offset + 5)
      const sampleRate = getSampleRateFromFrequencyDivisor(frequencyDivisor)
      if (codec === Codec.UNSIGNED_PCM_8) {
        const buffer = new Uint8ClampedArray(dataView.buffer.slice(offset + 6, offset + 4 + blockSize))
        // TODO: Convertir este buffer en un buffer de audio molón.
        blocks.push({
          type: blockType,
          size: blockSize,
          payload: {
            frequencyDivisor,
            codec,
            sampleRate,
            buffer
          }
        })
      } else {
        throw new Error('Unsupported VOC codec :(')
      }
    } else if (blockType === BlockType.SOUND_DATA_CONTINUATION) {
      const buffer = new Uint8ClampedArray(dataView.buffer.slice(offset + 4, offset + 4 + blockSize))
      blocks.push({
        type: blockType,
        size: blockSize,
        payload: {
          buffer
        }
      })
    } else if (blockType === BlockType.SOUND_DATA_NF) {
      const sampleRate = dataView.getUint32(offset + 4, true)
      const bitsPerSample = dataView.getUint8(offset + 8)
      const numChannels = dataView.getUint8(offset + 9)
      const codec = dataView.getUint16(offset + 10, true)
      const reserved = dataView.getUint32(offset + 12, true)
      const buffer = dataView.buffer.slice(offset + 12, offset + 10 + blockSize)
      blocks.push({
        type: blockType,
        size: blockSize,
        payload: {
          sampleRate,
          bitsPerSample,
          numChannels,
          codec,
          reserved,
          buffer
        }
      })
    } else if (blockType === BlockType.SILENCE) {
      const length = dataView.getUint16(offset + 4, true) - 1
      const frequencyDivisor = dataView.getUint8(offset + 6)
      const sampleRate = getSampleRateFromFrequencyDivisor(frequencyDivisor)
      blocks.push({
        type: blockType,
        size: blockSize,
        payload: {
          length,
          frequencyDivisor,
          sampleRate
        }
      })
    } else if (blockType === BlockType.EXTRA_INFO) {
      const frequencyDivisor = dataView.getUint16(offset + 4)
      const codec = dataView.getUint8(offset + 6)
      const numChannels = dataView.getUint8(offset + 7)
      const sampleRate = getSampleRateFromNumChannelsFrequencyDivisor(numChannels, frequencyDivisor)
      blocks.push({
        type: blockType,
        size: blockSize,
        payload: {
          frequencyDivisor,
          codec,
          numChannels,
          sampleRate
        }
      })
    } else if (blockType === BlockType.MARKER) {
      const mark = dataView.getUint16(offset + 4, true)
      blocks.push({
        type: blockType,
        size: blockSize,
        payload: {
          mark
        }
      })
    } else if (blockType === BlockType.TEXT) {
      const text = dataViewUtils.getNullString(dataView, offset + 4)
      blocks.push({
        type: blockType,
        size: blockSize,
        payload: {
          text
        }
      })
    } else if (blockType === BlockType.REPEAT_START) {
      const repetitions = dataView.getUint16(offset + 4, true)
      blocks.push({
        type: blockType,
        size: blockSize,
        payload: {
          repetitions
        }
      })
    } else if (blockType === BlockType.REPEAT_END) {
      // Este bloque está vacío.
      blocks.push({
        type: blockType,
        size: blockSize,
        payload: {

        }
      })
    }
    offset += 4 + blockSize
  }
  return {
    signature,
    major,
    minor,
    version,
    blocks
  }
}

/**
 * Parses a .VOC file from a directory entry
 * @function
 * @param {DirectoryEntry} directoryEntry
 */
export const parseEntry = createParseEntry(parse)

/**
 * Creates an AudioBuffer from a DirectoryEntry
 * @param {AudioContext} audioContext
 * @param {DirectoryEntry} entry
 * @returns {AudioBuffer}
 */
export function createAudioBufferFromEntry(audioContext, entry) {
  let bufferLength = 0
  let sampleRate = null
  const buffers = []
  for (const block of entry.blocks) {
    if (block.type === BlockType.SOUND_DATA) {
      sampleRate = Math.round(block.payload.sampleRate / 1000) * 1000
    }

    if (block.type === BlockType.SOUND_DATA || block.type === BlockType.SOUND_DATA_CONTINUATION) {
      bufferLength += block.payload.buffer.length
      buffers.push(block.payload.buffer)
    }
  }

  if (bufferLength === 0) {
    throw new Error('Invalid buffer length')
  }

  if (sampleRate === null) {
    throw new Error('Invalid sample rate')
  }

  const buffer = typedArray.createFloat32FromUint8(typedArray.from(...buffers))
  const audioBuffer = audioContext.createBuffer(1, bufferLength, sampleRate)
  audioBuffer.copyToChannel(buffer, 0, 0)
  return audioBuffer
}

export default {
  parse,
  parseEntry,
  createAudioBufferFromEntry
}
