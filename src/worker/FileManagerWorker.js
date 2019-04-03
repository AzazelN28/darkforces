import gob from 'files/gob'
import pal from 'files/pal'
import voc from 'files/voc'
import lev from 'files/lev'
import inf from 'files/inf'
import o from 'files/o'
import gol from 'files/gol'
import gmd from 'files/gmd'
import wax from 'files/wax'
import fme from 'files/fme'
import o3d from 'files/3do'
import bm from 'files/bm'
import fnt from 'files/fnt'
import vue from 'files/vue'
import msg from 'files/msg'
import lvl from 'files/lvl'
import lfd from 'files/lfd'

const state = {
  // entries.
  entries: [],
  // palette used.
  palette: null
}

/**
 * Parses any element by its extension.
 * @param {DirectoryEntry} entry
 * @returns {Promise<Error|*>}
 */
function parseByExtension(entry) {
  if (!entry) {
    return Promise.reject(new Error('Entry not found'))
  }
  const [, , extension] = entry.name.match(/^([^.]+)\.(.*)$/)
  switch (extension.toUpperCase()) {
  default: return Promise.reject(new Error('Entry extension not recognized'))
  case 'BM': return Promise.resolve(bm.parseEntry(entry))
  case 'INF': return Promise.resolve(inf.parseEntry(entry))
  case '3DO': return Promise.resolve(o3d.parseEntry(entry))
  case 'FME': return Promise.resolve(fme.parseEntry(entry))
  case 'FNT': return Promise.resolve(fnt.parseEntry(entry))
  case 'GOL': return Promise.resolve(gol.parseEntry(entry))
  case 'GMD': return Promise.resolve(gmd.parseEntry(entry))
  case 'LFD': return Promise.resolve(lfd.parseEntry(entry))
  case 'LEV': return Promise.resolve(lev.parseEntry(entry))
  case 'LVL': return Promise.resolve(lvl.parseEntry(entry))
  case 'MSG': return Promise.resolve(msg.parseEntry(entry))
  case 'O': return Promise.resolve(o.parseEntry(entry))
  case 'PAL': return Promise.resolve(pal.parseEntry(entry))
  case 'VOC': return Promise.resolve(voc.parseEntry(entry))
  case 'VUE': return Promise.resolve(vue.parseEntry(entry))
  case 'WAX': return Promise.resolve(wax.parseEntry(entry))
  }
}

self.addEventListener('message', (e) => {
  const { type, id, payload } = e.data
  if (type === 'store') {
    const { arrayBuffer } = payload
    try {
      const entries = gob.parse(new DataView(arrayBuffer))
      state.entries.push(...entries)
      self.postMessage({
        id,
        status: 'ok',
        payload: {
          entries: entries.map(({ name, size, start }) => ({ name, size, start }))
        }
      })
    } catch (error) {
      self.postMessage({
        id,
        status: 'error',
        error
      })
    }
  } else if (type === 'filter') {
    const { pattern } = payload
    self.postMessage({
      id,
      status: 'ok',
      payload: {
        entries: state.entries.filter((entry) => pattern.test(entry.name))
      }
    })
  } else if (type === 'fetch') {
    const { name } = payload
    const entry = state.entries.find((entry) => entry.name === name)
    console.log(entry)
    parseByExtension(entry)
      .then((payload) => {
        // TODO: Si hay alguna paleta, entonces
        // en función de si estamos cargando una fuente, textura
        // o sprite, aplicamos esa paleta.
        self.postMessage({
          id,
          status: 'ok',
          payload
        })
      })
      .catch((error) => self.postMessage({
        id,
        status: 'error',
        error
      }))
  }
})
