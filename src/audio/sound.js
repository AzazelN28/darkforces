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
  play
}
