import gob from 'files/gob'
import lfd from 'files/lfd'
import level from 'level'
import sound from 'audio/sound'
import { vec2 } from 'gl-matrix'

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
      const currentLevel = level.load(entryMap, 'GROMAS')
      console.log(currentLevel)
      const canvas = document.querySelector('canvas')
      const cx = canvas.getContext('2d')
      canvas.width = 320
      canvas.height = 200

      const keys = new Map()
      let zoom = 1.0
      const velocity = vec2.create()
      const position = vec2.create()

      function key(e) {
        keys.set(e.code, e.type === 'keydown')
      }

      let frameID
      function frame(time) {
        if (keys.get('ArrowUp')) {
          velocity[1] -= 1
        } else if (keys.get('ArrowDown')) {
          velocity[1] += 1
        }

        if (keys.get('ArrowLeft')) {
          velocity[0] -= 1
        } else if (keys.get('ArrowRight')) {
          velocity[0] += 1
        }

        if (keys.get('KeyZ')) {
          zoom -= 0.1
        } else if (keys.get('KeyA')) {
          zoom += 0.1
        }

        position[0] -= velocity[0]
        position[1] -= velocity[1]

        velocity[0] *= 0.9
        velocity[1] *= 0.9

        if (canvas.width !== canvas.clientWidth) {
          canvas.width = canvas.clientWidth
        }

        if (canvas.height !== canvas.clientHeight) {
          canvas.height = canvas.clientHeight
        }

        cx.clearRect(0, 0, cx.canvas.width, cx.canvas.height)

        cx.save()
        cx.translate(position[0], position[1])

        for (const sector of currentLevel.sectors) {
          let mx = 0, my = 0
          for (const wall of sector.walls) {
            const [sx, sy] = sector.vertices[wall.left]
            const [ex, ey] = sector.vertices[wall.right]
            cx.beginPath()
            cx.moveTo(sx * zoom, sy * zoom)
            cx.lineTo(ex * zoom, ey * zoom)
            if (wall.adjoin !== -1) {
              cx.strokeStyle = '#ff0'
            } else {
              cx.strokeStyle = '#fff'
            }
            mx += ex * zoom
            my += ey * zoom
            cx.stroke()
          }

          mx /= sector.walls.length
          my /= sector.walls.length

          if (sector.name) {
            cx.font = '16px monospace'
            cx.textAlign = 'center'
            cx.textBaseline = 'middle'
            cx.fillStyle = '#fff'
            cx.fillText(sector.name, mx, my)
          }

          for (const [x, y] of sector.vertices) {
            const zx = x * zoom
            const zy = y * zoom
            cx.beginPath()
            cx.moveTo(zx, zy - 2)
            cx.lineTo(zx + 2, zy)
            cx.lineTo(zx, zy + 2)
            cx.lineTo(zx - 2, zy)
            cx.fillStyle = '#0ff'
            cx.fill()
          }
        }

        for (const object of currentLevel.objects) {
          const { x, z: y, className, yaw } = object
          const zx = x * zoom
          const zy = y * zoom
          if (className === 'sprite') {
            cx.strokeStyle = '#f00'
            cx.fillStyle = '#f00'
          } else if (className === 'spirit') {
            cx.strokeStyle = '#f0f'
            cx.fillStyle = '#f0f'
          } else if (className === 'frame') {
            cx.strokeStyle = '#ff0'
            cx.fillStyle = '#ff0'
          } else if (className === '3d') {
            cx.strokeStyle = '#00f'
            cx.fillStyle = '#00f'
          }
          cx.beginPath()
          cx.moveTo(zx, zy - 2)
          cx.lineTo(zx + 2, zy)
          cx.lineTo(zx, zy + 2)
          cx.lineTo(zx - 2, zy)
          cx.closePath()
          cx.stroke()

          cx.beginPath()
          cx.moveTo(zx, zy)
          cx.lineTo(zx + Math.cos(yaw * Math.PI / 180) * 4, zy + Math.sin(yaw * Math.PI / 180) * 4)
          cx.stroke()

          cx.font = '16px monospace'
          cx.textAlign = 'center'
          cx.textBaseline = 'middle'
          let accuY = 16
          if (object.typeName) {
            cx.fillText(object.typeName, zx, zy + accuY)
            accuY += 16
          }
          if (object.logics) {
            for (const logic of object.logics) {
              cx.fillText(logic, zx, zy + accuY)
              accuY += 16
            }
          }
        }

        cx.restore()

        cx.font = '16px monospace'
        cx.textAlign = 'left'
        cx.textBaseline = 'top'
        cx.fillStyle = '#fff'
        cx.fillText(`${frameID} ${time}`, 0, 0)

        frameID = window.requestAnimationFrame(frame)
      }

      function start() {
        window.addEventListener('keyup', key)
        window.addEventListener('keydown', key)
        frameID = window.requestAnimationFrame(frame)
      }

      start()
    })
}
