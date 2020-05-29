import EventEmitter from 'events'
import Worker from './FileManager.worker'

/**
 * FileManager loads data into a Worker to parallelize parsing
 * data from .gob files.
 */
export default class FileManager extends EventEmitter {
  constructor() {
    super()

    const handler = (e) => {
      if (e.data.type === 'ready') {
        e.target.removeEventListener('message', handler)
        this._isReady = true
        this.emit('ready', this)
      } else if (e.data.type === 'progress') {
        this.emit('progress', {
          lengthComputable: e.data.lengthComputable,
          total: e.data.total,
          loaded: e.data.loaded,
          progress: e.data.progress
        })
      } else if (e.data.type === 'error') {
        e.target.removeEventListener('message', handler)
        this._isReady = false
        this.emit('error')
      } else {
        throw new Error('Invalid message')
      }
    }

    this._isReady = false
    this._worker = new Worker()
    this._worker.addEventListener('message', handler)
    this._id = 0
  }

  _send(type, payload, transferable) {
    const id = ++this._id
    return new Promise((resolve, reject) => {
      function handler(e) {
        if (e.data.id !== id) {
          return
        }
        e.target.removeEventListener('message', handler)
        if (e.data.status === 'ok') {
          return resolve(e.data.payload)
        }
        return reject(e.data.error)
      }
      this._worker.addEventListener('message', handler)
      this._worker.postMessage({
        type,
        payload,
        id
      }, transferable)
    })
  }

  store(arrayBuffer) {
    return this._send('store', {
      arrayBuffer
    }, [arrayBuffer])
  }

  fetch(name) {
    return this._send('fetch', {
      name
    })
  }
}
