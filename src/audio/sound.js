import { BlockType } from 'files/voc'
import typedArray from 'utils/typedArray'

const audioBufferCache = new Map()

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

    if (block.type === BlockType.SOUND_DATA
     || block.type === BlockType.SOUND_DATA_CONTINUATION) {
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

/**
 * Plays a sound
 * @param {AudioContext} audioContext
 * @param {DirectoryEntry} entry
 * @returns {AudioBufferSourceNode}
 */
export function playEntry(audioContext, entry) {
  if (!audioBufferCache.has(entry)) {
    audioBufferCache.set(entry, createAudioBufferFromEntry(audioContext, entry))
  }
  const audioBuffer = audioBufferCache.get(entry)
  return play(audioContext, audioBuffer)
}

/**
 * Plays a sound and returns an AudioBufferSourceNode
 * @param {AudioContext} audioContext
 * @param {AudioBuffer} audioBuffer
 * @param {number} [when=0]
 * @param {number} [offset=0]
 * @param {number} [duration=audioBuffer.duration]
 * @returns {AudioBufferSourceNode}
 */
export function play(audioContext, audioBuffer, when=audioContext.currentTime, offset=0, duration = audioBuffer.duration) {
  const audioBufferSource = audioContext.createBufferSource()
  audioBufferSource.buffer = audioBuffer
  audioBufferSource.connect(audioContext.destination)
  audioBufferSource.start(when, offset, duration)
  return audioBufferSource
}

export default {
  createAudioBufferFromEntry,
  playEntry,
  play
}
