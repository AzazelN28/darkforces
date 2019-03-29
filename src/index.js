import gob from 'files/gob'
import fnt from 'files/fnt'
import pal from 'files/pal'
import bm from 'files/bm'
import fme from 'files/fme'
import wax from 'files/wax'
import voc from 'files/voc'
import lvl from 'files/lvl'
import msg from 'files/msg'
import gol from 'files/gol'
import lfd from 'files/lfd'
import o3d from 'files/3do'

lfd
  .load('data/lfd/dfbrief.lfd')
  .then((lfd) => {
    console.log(lfd)
  })

gob
  .loadAll(
    'data/dark.gob',
    'data/sounds.gob',
    'data/sprites.gob',
    'data/textures.gob'
  )
  .then(entries => {
    const entryMap = new Map(entries.map(entry => [entry.name, entry]))

    console.log(o3d.parseEntry(entryMap.get('DEFAULT.3DO')))
    const text = msg.parseEntry(entryMap.get('TEXT.MSG'))
    console.log(text)
    //const local = msg.parseEntry(entryMap.get('LOCAL.MSG'))
    const levels = lvl.parseEntry(entryMap.get('JEDI.LVL'))
    console.log(levels)
    const fall = voc.parseEntry(entryMap.get('FALL.VOC'))
    const mofRebus = fme.parseEntry(entryMap.get('MOFREBUS.FME'))
    //const defwax = wax.parseEntry(entryMap.get('DEFAULT.WAX'))
    const statusRight = bm.parseEntry(entryMap.get('STATUSRT.BM'))
    const statusLeft = bm.parseEntry(entryMap.get('STATUSLF.BM'))
    const palette = pal.parseEntry(entryMap.get('SECBASE.PAL'))
    const font = fnt.parseEntry(entryMap.get('GLOWING.FNT'))
    const goals = gol.parseEntry(entryMap.get('SECBASE.GOL'))
    console.log(goals)
    const audio = new AudioContext()

    // Este código convierte el audio recibido en un archivo
    // .VOC a un audio "audible" XD
    console.log(fall)

    const audioBuffer = audio.createBuffer(1, 32256, 11000)

    const source = fall.blocks[0].payload.buffer

    const dest = new Float32Array(32256)
    for (let i = 0; i < source.byteLength; i++) {
      dest[i] = (source[i] - 127) / 128
    }
    audioBuffer.copyToChannel(dest, 0, 0)

    const audioBufferSource = audio.createBufferSource()
    audioBufferSource.buffer = audioBuffer
    audioBufferSource.connect(audio.destination)
    audioBufferSource.start()

    const canvas = document.querySelector('canvas')
    const cx = canvas.getContext('2d')
    const scaleFactor = 0.5
    //console.log(defwax)

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        entry.target.width = entry.target.clientWidth * scaleFactor
        entry.target.height = entry.target.clientHeight * scaleFactor
      }
    })
    ro.observe(canvas)

    fme.use(mofRebus, palette)
    bm.use(statusLeft, palette)
    bm.use(statusRight, palette)

    fnt.use(font, palette)
    function frame() {
      fme.render(mofRebus, cx, 0, 0)
      bm.render(statusLeft, cx, 0, canvas.height - statusRight.height)
      bm.render(statusRight, cx, canvas.width - statusRight.width, canvas.height - statusRight.height)
      fnt.render(font, cx, 'Hola mundo!\nAdios Mundo!', 0, 16)
      window.requestAnimationFrame(frame)
    }
    window.requestAnimationFrame(frame)
  })
