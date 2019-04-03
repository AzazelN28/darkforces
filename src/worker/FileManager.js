export default class FileManager {
  constructor() {
    this._worker = new Worker('FileManagerWorker.js')
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

  filter(pattern) {
    return this._send('filter', {
      pattern
    })
  }

  fetch(name) {
    return this._send('fetch', {
      name
    })
  }
}
