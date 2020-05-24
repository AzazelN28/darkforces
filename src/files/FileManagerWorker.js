import gob from './gob'
import pal from './pal'
import cmp from './cmp'
import voc from './voc'
import lev from './lev'
import inf from './inf'
import o from './o'
import gol from './gol'
import gmd from './gmd'
import wax from './wax'
import fme from './fme'
import o3d from './3do'
import bm from './bm'
import fnt from './fnt'
import vue from './vue'
import msg from './msg'
import lvl from './lvl'
import lfd from './lfd'

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
    return Promise.reject(new Error(`Entry ${entry} could not be found`))
  }
  const [, , extension] = entry.name.match(/^([^.]+)\.(.*)$/)
  switch (extension.toUpperCase()) {
  default:
    return Promise.reject(new Error('Entry extension not recognized'))
  case 'BM':
    return Promise.resolve(bm.use(bm.parseEntry(entry), state.palette))
  case 'INF':
    return Promise.resolve(inf.parseEntry(entry))
  case '3DO':
    return Promise.resolve(o3d.parseEntry(entry))
  case 'FME':
    return Promise.resolve(fme.use(fme.parseEntry(entry), state.palette))
  case 'FNT':
    return Promise.resolve(fnt.parseEntry(entry))
  case 'GOL':
    return Promise.resolve(gol.parseEntry(entry))
  case 'GMD':
    return Promise.resolve(gmd.parseEntry(entry))
  case 'LFD':
    return Promise.resolve(lfd.parseEntry(entry))
  case 'LEV':
    return Promise.resolve(lev.parseEntry(entry))
  case 'LVL':
    return Promise.resolve(lvl.parseEntry(entry))
  case 'MSG':
    return Promise.resolve(msg.parseEntry(entry))
  case 'O':
    return Promise.resolve(o.parseEntry(entry))
  case 'PAL':
    state.palette = pal.parseEntry(entry)
    return Promise.resolve(state.palette)
  case 'CMP':
    return Promise.resolve(cmp.parseEntry(entry))
  case 'VOC':
    return Promise.resolve(voc.parseEntry(entry))
  case 'VUE':
    return Promise.resolve(vue.parseEntry(entry))
  case 'WAX':
    return Promise.resolve(wax.use(wax.parseEntry(entry), state.palette))
  }
}

/**
 * Listens to messages that comes from the main thread.
 */
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
          entries: entries.map(({
            name,
            size,
            start
          }) => ({
            name,
            size,
            start
          }))
        }
      })
    } catch (error) {
      self.postMessage({
        id,
        status: 'error',
        error: error.toString()
      })
    }
  } else if (type === 'fetch') {
    const { name } = payload
    const entry = state.entries.find((entry) => entry.name === name)
    if (!entry && name.substr(-3) !== '.BM' && name.substr(-4) !== '.WAX' && name.substr(-4) !== '.VOC') {
      return self.postMessage({
        id,
        status: 'error',
        error: `Entry ${name} not found`
      })
    } else if (!entry && (name.substr(-3) === '.BM' || name.substr(-4) === '.WAX' || name.substr(-4) === '.VOC')) {
      return self.postMessage({
        id,
        status: 'ok',
        payload: null
      })
    }
    return parseByExtension(entry)
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
        error: error.toString()
      }))
  }
})

/**
 * Loads all the files needed to run Dark Forces.
 */
/*gob
  .loadAll(
    'data/dark.gob',
    'data/sounds.gob',
    'data/sprites.gob',
    'data/textures.gob'
  )
  .then(entries => {
    state.entries = entries
    self.postMessage({
      type: 'ready'
    })
  })
*/
gob
  .loadAllWithProgress({
    urls: [
      'data/dark.gob',
      'data/sounds.gob',
      'data/sprites.gob',
      'data/textures.gob'
    ],
    oncomplete (entries) {
      state.entries = entries
      console.log(entries)
      self.postMessage({
        type: 'ready'
      })
    },
    onprogress ({ lengthComputable, progress, loaded, total }) {
      self.postMessage({
        type: 'progress',
        lengthComputable,
        progress,
        loaded,
        total
      })
    },
    onerror () {
      self.postMessage({
        type: 'error'
      })
    }
  })
