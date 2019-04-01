import gob from 'files/gob'
import lfd from 'files/lfd'
import level from 'level'
import sound from 'audio/sound'
import { vec3, mat4 } from 'gl-matrix'

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
      const currentLevel = level.load(entryMap, 'SECBASE')
      const engine = document.querySelector('canvas#engine')
      const debug = document.querySelector('canvas#debug')
      const gl = engine.getContext('webgl', {
        antialias: false
      })
      const cx = debug.getContext('2d')

      const UP = vec3.fromValues(0,-1,0)
      const DOWN = vec3.fromValues(0,1,0)
      const FORWARD = vec3.fromValues(0,0,-1)
      const BACKWARD = vec3.fromValues(0,0,1)
      const STRAFE_LEFT = vec3.fromValues(-1,0,0)
      const STRAFE_RIGHT = vec3.fromValues(1,0,0)

      const up = vec3.fromValues(0,-1,0)
      const down = vec3.fromValues(0,1,0)
      const forward = vec3.fromValues(0,0,-1)
      const backward = vec3.fromValues(0,0,1)
      const strafeLeft = vec3.fromValues(-1, 0, 0)
      const strafeRight = vec3.fromValues(1, 0, 0)
      const isRenderDebugEnabled = 1
      const keys = new Map()
      let zoom = 1.0
      const velocity = vec3.create()
      const position = vec3.create()
      const direction = vec3.create()
      const projection = mat4.create()
      const model = mat4.create()
      const view = mat4.create()
      const rotation = mat4.create()
      const projectionView = mat4.create()
      const projectionViewModel = mat4.create()

      const vertexShader = gl.createShader(gl.VERTEX_SHADER)
      gl.shaderSource(vertexShader, `
        precision highp float;

        attribute vec3 a_coords;
        uniform mat4 u_mvp;
        uniform vec3 u_color;

        varying vec3 v_color;

        void main() {
          vec4 position = u_mvp * vec4(a_coords, 1.0);
          gl_Position = vec4(position.x, -position.y, position.z, position.w);
          v_color = u_color;
        }
      `)
      gl.compileShader(vertexShader)
      if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(vertexShader))
      }

      const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)
      gl.shaderSource(fragmentShader, `
        precision highp float;

        varying vec3 v_color;
        void main() {
          gl_FragColor = vec4(v_color,1.0);
        }
      `)
      gl.compileShader(fragmentShader)
      if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(fragmentShader))
      }

      const program = gl.createProgram()
      gl.attachShader(program, vertexShader)
      gl.attachShader(program, fragmentShader)
      gl.linkProgram(program)
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program))
      }

      console.log('Uploading buffers...')
      for (const sector of currentLevel.sectors) {
        sector.buffered.walls = sector.geometries.walls.map((wall) => {
          const buffer = gl.createBuffer()
          gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
          gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(wall), gl.STATIC_DRAW)
          return buffer
        })
        sector.buffered.planes = sector.geometries.planes.map((plane) => {
          const buffer = gl.createBuffer()
          gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
          gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(plane), gl.STATIC_DRAW)
          return buffer
        })
      }
      console.log('All buffers uploaded')

      function key(e) {
        keys.set(e.code, e.type === 'keydown')
      }

      function input() {
        // Move forward & backwards
        if (keys.get('KeyA') || keys.get('ArrowLeft')) {
          vec3.add(velocity, velocity, strafeLeft)
        } else if (keys.get('KeyD') || keys.get('ArrowRight')) {
          vec3.add(velocity, velocity, strafeRight)
        }

        // Strafe left & right
        if (keys.get('KeyW') || keys.get('ArrowUp')) {
          vec3.add(velocity, velocity, forward)
        } else if (keys.get('KeyS') || keys.get('ArrowDown')) {
          vec3.add(velocity, velocity, backward)
        }

        // Move up & down
        if (keys.get('KeyQ') || keys.get('PageUp')) {
          vec3.add(velocity, velocity, up)
        } else if (keys.get('KeyE') || keys.get('PageDown')) {
          vec3.add(velocity, velocity, down)
        }

        if (keys.get('KeyR')) {
          gl.canvas.requestPointerLock()
        }
      }

      function update() {
        vec3.transformMat4(forward, FORWARD, rotation)
        vec3.transformMat4(backward, BACKWARD, rotation)
        vec3.transformMat4(strafeLeft, STRAFE_LEFT, rotation)
        vec3.transformMat4(strafeRight, STRAFE_RIGHT, rotation)

        vec3.add(position, position, velocity)
        vec3.scale(velocity, velocity, 0.9)
      }

      let isDirty = false

      function mouse(e) {
        if (document.pointerLockElement) {
          direction[0] += e.movementY / gl.canvas.height
          direction[1] += -e.movementX / gl.canvas.width
        }
      }

      function render() {
        if (gl.canvas.width !== gl.canvas.clientWidth) {
          gl.canvas.width = gl.canvas.clientWidth
          isDirty = true
        }

        if (gl.canvas.height !== gl.canvas.clientHeight) {
          gl.canvas.height = gl.canvas.clientHeight
          isDirty = true
        }

        if (isDirty) {
          mat4.perspective(projection, Math.PI * 0.25, gl.canvas.width / gl.canvas.height, 0.1, 1000.0)
        }

        mat4.identity(rotation)
        mat4.rotateY(rotation, rotation, direction[1])
        mat4.rotateX(rotation, rotation, direction[0])

        mat4.identity(model)
        mat4.translate(model, model, position)
        mat4.multiply(model, model, rotation)
        mat4.invert(view, model)
        mat4.multiply(projectionView, projection, view)

        gl.viewport(0,0,gl.canvas.width,gl.canvas.height)

        gl.clearColor(0, 0, 0, 1)
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

        gl.enable(gl.DEPTH_TEST)
        gl.useProgram(program)

        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'u_mvp'), false, projectionView)

        for (const sector of currentLevel.sectors) {
          gl.uniform3fv(gl.getUniformLocation(program, 'u_color'), sector.wallColor)
          for (const wall of sector.buffered.walls) {
            gl.bindBuffer(gl.ARRAY_BUFFER, wall)
            gl.enableVertexAttribArray(gl.getAttribLocation(program, 'a_coords'))
            gl.vertexAttribPointer(gl.getAttribLocation(program, 'a_coords'), 3, gl.FLOAT, gl.FALSE, 0, 0)
            gl.drawArrays(gl.TRIANGLE_FAN, 0, gl.getBufferParameter(gl.ARRAY_BUFFER, gl.BUFFER_SIZE) / 12)
          }

          gl.uniform3fv(gl.getUniformLocation(program, 'u_color'), sector.planeColor)
          for (const plane of sector.buffered.planes) {
            gl.bindBuffer(gl.ARRAY_BUFFER, plane)
            gl.enableVertexAttribArray(gl.getAttribLocation(program, 'a_coords'))
            gl.vertexAttribPointer(gl.getAttribLocation(program, 'a_coords'), 3, gl.FLOAT, gl.FALSE, 0, 0)
            gl.drawArrays(gl.TRIANGLE_FAN, 0, gl.getBufferParameter(gl.ARRAY_BUFFER, gl.BUFFER_SIZE) / 12)
          }
        }
      }

      function renderDebug(time) {
        if (!isRenderDebugEnabled) {
          return
        }

        if (cx.canvas.width !== cx.canvas.clientWidth) {
          cx.canvas.width = cx.canvas.clientWidth
        }

        if (cx.canvas.height !== cx.canvas.clientHeight) {
          cx.canvas.height = cx.canvas.clientHeight
        }

        cx.clearRect(0, 0, cx.canvas.width, cx.canvas.height)

        cx.save()
        cx.translate(position[0], position[2])

        for (const sector of currentLevel.sectors) {
          let mx = 0
            , my = 0
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

        if (isRenderDebugEnabled < 2) {
          cx.restore()
          return
        }

        for (const object of currentLevel.objects) {
          const {
            x,
            z: y,
            className,
            yaw
          } = object
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
      }

      let frameID
      function frame(time) {
        input(time)
        update(time)
        render(time)
        renderDebug(time)

        frameID = window.requestAnimationFrame(frame)
      }

      function start() {
        window.addEventListener('mousedown', mouse)
        window.addEventListener('mousemove', mouse)
        window.addEventListener('keyup', key)
        window.addEventListener('keydown', key)
        frameID = window.requestAnimationFrame(frame)
      }

      start()
    })
}
