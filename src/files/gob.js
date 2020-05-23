/** @module files/gob */
import dataViewUtils from 'utils/dataView'

/**
 * A directory entry represents a file inside a .GOB file.
 * @typedef {Object} DirectoryEntry
 * @property {string} name - Name of the entry (uses the DOS convention 8 letters, a dot and 3 letters for extension)
 * @property {string} start - Offset in bytes of the entry
 * @property {string} size - Size in bytes of the entry
 * @property {DataView} dataView - DataView where you can find the entry
 */

/**
 * Returns an array of directory entries from the .GOB file.
 * @param {DataView} dataView - .GOB DataView
 * @returns {Array<DirectoryEntry>} - List of files inside the .GOB file
 */
export function parse(dataView) {
  const entries = []
  const signature = dataViewUtils.getString(dataView, 0, 4)
  if (signature !== 'GOB\x0a') {
    throw new Error('Invalid GOB header')
  }
  let offset = dataView.getUint32(4, true)
  const count = dataView.getUint32(offset, true)
  offset += 4
  for (let index = 0; index < count; index++) {
    const name = dataViewUtils.getNullString(dataView, offset + 8, offset + 21)
    const start = dataView.getUint32(offset, true)
    const size = dataView.getUint32(offset + 4, true)
    const entry = {
      start,
      size,
      name,
      dataView,
    }
    entries.push(entry)
    offset += 21
  }
  return entries
}

/**
 * Loads a .GOB file with progress.
 * @param {*} param0
 */
export function loadWithProgress({ url, oncomplete, onprogress, onerror }) {
  const xhr = new XMLHttpRequest()

  function handler (e) {
    if (e.type !== 'progress') {
      xhr.onload = null
      xhr.onprogress = null
      xhr.onerror = null
      xhr.ontimeout = null
      xhr.onabort = null
    }

    if (e.type === 'load') {
      const dataView = new DataView(e.target.response)
      return oncomplete(parse(dataView))
    } else if (e.type === 'progress') {
      const { lengthComputable, loaded, total } = e
      const progress = lengthComputable ? loaded / total : Infinity
      return onprogress({ lengthComputable, progress, loaded, total })
    } else {
      return onerror(e.type)
    }
  }

  xhr.responseType = 'arraybuffer'
  xhr.onload = handler
  xhr.onprogress = handler
  xhr.onerror = handler
  xhr.ontimeout = handler
  xhr.onabort = handler
  xhr.open('GET', url)
  xhr.send()
}

/**
 *
 * @param {*} param0
 */
export function loadAllWithProgress({ urls, oncomplete, onprogress, onerror }) {
  const entries = []

  const length = urls.length
  let index = 0

  function doLoad () {
    const url = urls.shift()
    loadWithProgress({
      url,
      oncomplete (currentEntries) {
        index++
        entries.push(...currentEntries)
        if (urls.length > 0) {
          doLoad()
        } else {
          oncomplete(entries)
        }
      },
      onprogress (e) {
        onprogress({
          lengthComputable: e.lengthComputable,
          loaded: e.loaded,
          total: e.total,
          progress: (index / length) + (e.progress / length)
        })
      },
      onerror
    })
  }

  doLoad()
}

/**
 * Loads a .GOB file
 * @param {URL|string} url - Url to load
 * @returns {Promise<Array<DirectoryEntry>|Error>}
 */
export function load(url) {
  return fetch(url)
    .then(response => response.arrayBuffer())
    .then(arrayBuffer => new DataView(arrayBuffer))
    .then(dataView => parse(dataView))
}

/**
 * Loads multiple .GOB files
 * @param {...URL|string} urls - Urls to load
 * @returns {Promise<Array<DirectoryEntry>|Error>}
 */
export function loadAll(...urls) {
  return Promise
    .all(urls.map(load))
    .then((...entries) => {
      return entries.reduce((flattened, entries) =>
        flattened.concat(...entries),
      [])
    })
}

export default {
  parse,
  load,
  loadAll,
  loadWithProgress,
  loadAllWithProgress
}
