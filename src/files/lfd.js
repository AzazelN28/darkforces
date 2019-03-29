/** @module files/lfd */
import dataViewUtils from 'utils/dataView'

/**
 * Returns a chunk payload depending on the type of chunk.
 *
 * @param {DataView} dataView
 * @param {string} id
 * @param {number} start
 * @param {number} size
 * @returns {Payload}
 */
function getChunkPayload(dataView, id, start, size) {
  if (id === 'RMAP') { // Resource map
    let offset = start
    const chunks = []
    const numChunks = size / 16
    for (let numChunk = 0; numChunk < numChunks; numChunk++) {
      const chunkId = dataViewUtils.getString(dataView, offset, offset + 4)
      const chunkName = dataViewUtils.getNullString(dataView, offset + 4, offset + 12)
      const chunkSize = dataView.getUint32(offset + 12, true)
      chunks.push({
        id: chunkId,
        name: chunkName,
        size: chunkSize
      })
      offset += 16
    }
    return chunks
  } else if (id === 'PLTT') { // Palette
    return dataViewUtils.getBytes(dataView, start, start + size)
  } else if (id === 'DELT') { // Delt? Delta?
    const unk1 = dataView.getUint32(start + 0, true)
    const width = dataView.getUint16(start + 4, true)
    const height = dataView.getUint16(start + 6, true)
    const unk2 = dataView.getUint16(start + 8, true)
    const unk3 = dataView.getUint16(start + 10, true)
    const unk4 = dataView.getUint16(start + 12, true)
    return {
      unk1,
      width,
      height,
      unk2,
      unk3,
      unk4
    }
  } else if (id === 'ANIM') { // Anim
    const unk1 = dataView.getUint16(start + 0, true)
    const unk2 = dataView.getUint32(start + 2, true)
    const unk3 = dataView.getUint32(start + 6, true)
    const unk4 = dataView.getUint16(start + 10, true)
    const unk5 = dataView.getUint16(start + 12, true)
    const unk6 = dataView.getUint16(start + 14, true)
    const unk7 = dataView.getUint16(start + 16, true)
    const unk8 = dataView.getUint16(start + 18, true)
    return {
      unk1,
      unk2,
      unk3,
      unk4,
      unk5,
      unk6,
      unk7,
      unk8,
    }
  } else if (id === 'FILM') { // Film
    const unk1 = dataView.getUint16(start + 0, true)
    const unk2 = dataView.getUint16(start + 2, true)
    const unk3 = dataView.getUint16(start + 4, true)
    let offset = start + 6
    const chunks = []
    while (offset < start + size) {
      const chunkId = dataViewUtils.getNullString(dataView, offset, offset + 4)
      const chunkName = dataViewUtils.getNullString(dataView, offset + 4, offset + 12)
      const chunkSize = dataView.getUint32(offset + 12, true)
      const payload = dataViewUtils.getBytes(dataView, offset + 16, offset + chunkSize)
      chunks.push({
        id: chunkId,
        name: chunkName,
        size: chunkSize,
        payload
      })
      offset += chunkSize
    }
    return chunks
  }
}

/**
 * Parses a .LFD file from a DataView
 * @param {DataView} dataView
 * @param {number} start
 * @param {number} size
 * @returns {Array<Chunk>}
 */
export function parse(dataView, start, size) {
  // RMAP
  // <cadena de texto>
  // 4 bytes con posición
  // así hasta que una de las cadenas esté vacía.
  const chunks = []
  let offset = start
  while (offset < start + size) {
    const chunkId = dataViewUtils.getNullString(dataView, offset, offset + 4)
    const chunkName = dataViewUtils.getString(dataView, offset + 4, offset + 12)
    const chunkSize = dataView.getUint32(offset + 12, true)
    const chunkPayload = getChunkPayload(dataView, chunkId, offset + 16, chunkSize)
    chunks.push({
      id: chunkId,
      name: chunkName,
      size: chunkSize,
      payload: chunkPayload
    })
    offset += 16 + chunkSize
  }
  return chunks
}

/**
 * Parses a .LFD file from a directory entry.
 * @param {DirectoryEntry} directoryEntry
 */
export function parseEntry({ dataView, start, size }) {
  return parent(dataView, start, size)
}

/**
 * Loads a .LFD from a url
 * @param {URL|string} url
 * @returns {Promise<Array<Chunk>|Error>}
 */
export function load(url) {
  return fetch(url)
    .then((response) => response.arrayBuffer())
    .then((arrayBuffer) => new DataView(arrayBuffer))
    .then((dataView) => parse(dataView, 0, dataView.byteLength))
}

export default {
  load,
  parse,
  parseEntry,
}
