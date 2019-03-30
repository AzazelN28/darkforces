import gob from 'files/gob'
import fnt from 'files/fnt'
import pal from 'files/pal'
import bm from 'files/bm'
import fme from 'files/fme'
import wax from 'files/wax'
import voc from 'files/voc'
import lvl from 'files/lvl'
import lev from 'files/lev'
import msg from 'files/msg'
import gol from 'files/gol'
import lfd from 'files/lfd'
import o3d from 'files/3do'

import sound from 'audio/sound'

document.onclick = () => {
  document.onclick = null

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
      console.log(entryMap)

      console.log(o3d.parseEntry(entryMap.get('DEFAULT.3DO')))
      const text = msg.parseEntry(entryMap.get('TEXT.MSG'))
      console.log(text)
      //const local = msg.parseEntry(entryMap.get('LOCAL.MSG'))
      const levels = lvl.parseEntry(entryMap.get('JEDI.LVL'))
      console.log(levels)
      const fall = voc.parseEntry(entryMap.get('FALL.VOC'))
      const mofRebus = fme.parseEntry(entryMap.get('MOFREBUS.FME'))
      const stormTrooper = wax.parseEntry(entryMap.get('PHASE2.WAX'))
      console.log(stormTrooper)
      const statusRight = bm.parseEntry(entryMap.get('STATUSRT.BM'))
      const statusLeft = bm.parseEntry(entryMap.get('STATUSLF.BM'))
      const palette = pal.parseEntry(entryMap.get('SECBASE.PAL'))
      const level = lev.parseEntry(entryMap.get('SECBASE.LEV'))
      console.log(level)
      const font = fnt.parseEntry(entryMap.get('GLOWING.FNT'))
      const goals = gol.parseEntry(entryMap.get('SECBASE.GOL'))
      console.log(goals)
      const audioContext = new AudioContext()

      // Este código convierte el audio recibido en un archivo
      // .VOC a un audio "audible" XD
      console.log(fall)

      const audioBuffer = voc.createAudioBufferFromEntry(audioContext, fall)
      const audioBufferSource = sound.play(audioContext, audioBuffer)

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
      for (const state of stormTrooper.states) {
        console.log(state)
        for (const angle of state.angles) {
          for (const frame of angle.frames) {
            fme.use(frame.fme, palette)
          }
        }
      }
      bm.use(statusLeft, palette)
      bm.use(statusRight, palette)

      let currentState = 0
      let currentAngle = 0
      let currentFrame = 0

      fnt.use(font, palette)
      function frame() {
        cx.clearRect(0,0,cx.canvas.width,cx.canvas.height)
        fme.render(mofRebus, cx, 200, 100)
        const flooredCurrentFrame = Math.floor(currentFrame)
        fme.render(stormTrooper.states[currentState].angles[currentAngle].frames[flooredCurrentFrame].fme, cx, 100, 100)

        currentFrame += stormTrooper.states[currentState].frameRate / 60
        if (currentFrame >= stormTrooper.states[currentState].angles[currentAngle].frames.length) {
          currentFrame = 0
          currentAngle++
          if (currentAngle >= stormTrooper.states[currentState].angles.length) {
            currentAngle = 0
            currentState++
            if (currentState >= stormTrooper.states.length) {
              currentState = 0
              currentFrame = 0
              currentAngle = 0
            }
          }
        }

        bm.render(statusLeft, cx, 0, canvas.height - statusRight.height)
        bm.render(statusRight, cx, canvas.width - statusRight.width, canvas.height - statusRight.height)
        fnt.render(font, cx, 'Hola mundo!\nAdios Mundo!', 0, 16)
        fnt.render(font, cx, `${currentState} ${currentAngle} ${flooredCurrentFrame}`, 0, 32)
        window.requestAnimationFrame(frame)
      }
      window.requestAnimationFrame(frame)
    })
}
