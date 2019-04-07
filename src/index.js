import gob from 'files/gob'
import lfd from 'files/lfd'
import level from 'level'
import bm from 'files/bm'
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
      const isRenderDebugEnabled = 0
      const keys = new Map()
      let zoom = 1.0
      let currentTexture = 0
      let currentLayer = 1
      const velocity = vec3.create()
      const position = vec3.create()
      const direction = vec3.create()
      const projection = mat4.create()
      const model = mat4.create()
      const view = mat4.create()
      const rotation = mat4.create()
      const projectionView = mat4.create()
      const projectionViewModel = mat4.create()

      function createBuffer(gl, geometry) {
        const buffer = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geometry), gl.STATIC_DRAW)
        return buffer
      }

      const vertexShader = gl.createShader(gl.VERTEX_SHADER)
      gl.shaderSource(vertexShader, `
        precision highp float;

        attribute vec3 a_coords;
        attribute vec2 a_texcoords;

        uniform mat4 u_mvp;
        uniform vec3 u_color;

        varying vec3 v_color;
        varying vec2 v_texcoords;

        void main() {
          vec4 position = u_mvp * vec4(a_coords, 1.0);
          gl_Position = vec4(position.x, -position.y, position.z, position.w);
          v_color = u_color;
          v_texcoords = a_texcoords;
        }
      `)
      gl.compileShader(vertexShader)
      if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(vertexShader))
      }

      const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)
      gl.shaderSource(fragmentShader, `
        precision highp float;

        uniform sampler2D u_sampler;
        uniform int u_isWall;
        uniform vec2 u_wallSign;
        uniform float u_mix;

        varying vec3 v_color;
        varying vec2 v_texcoords;

        void main() {
          //gl_FragColor = vec4(v_color,1.0);
          vec4 color = (u_isWall == 1)
            ? mix(vec4(v_color, 1.0), texture2D(u_sampler, v_texcoords.xy / 8.0), u_mix)
            : mix(vec4(v_color, 1.0), texture2D(u_sampler, v_texcoords.xy / 8.0), u_mix);
          gl_FragColor = vec4(color);
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
        sector.floorBuffer = createBuffer(gl, sector.floorGeometry)
        sector.ceilingBuffer = createBuffer(gl, sector.ceilingGeometry)
        sector.walls.forEach((wall) => {
          if (wall.midGeometry) {
            wall.midBuffer = createBuffer(gl, wall.midGeometry)
          } else {
            wall.topBuffer = createBuffer(gl, wall.topGeometry)
            wall.bottomBuffer = createBuffer(gl, wall.bottomGeometry)
          }
        })
      }
      console.log('All buffers uploaded')

      console.log('Uploading textures...')
      for (const texture of currentLevel.textures) {
        if (texture && texture.imageData) {
          console.log(texture.width, texture.height)
          const tex = gl.createTexture()
          gl.bindTexture(gl.TEXTURE_2D, tex)
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.imageData)
          texture.texture = tex
        }
      }
      console.log('All textures uploaded')

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

        if (keys.get('BracketLeft')) {
          if (currentLayer > 0) {
            currentLayer--
          }
          console.log(currentLayer)
        } else if (keys.get('BracketRight')) {
          if (currentLayer < 9) {
            currentLayer++
          } else {
            currentLayer = 0
          }
          console.log(currentLayer)
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

        gl.enable(gl.CULL_FACE)
        gl.cullFace(gl.FRONT)
        gl.enable(gl.DEPTH_TEST)
        gl.useProgram(program)

        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'u_mvp'), false, projectionView)

        for (const sector of currentLevel.sectors) {
          if (currentLevel.textures[sector.floorTexture.index]) {
            gl.uniform1f(gl.getUniformLocation(program, 'u_mix'), 1)
            gl.uniform1i(gl.getUniformLocation(program, 'u_isWall'), 0)
            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, currentLevel.textures[sector.floorTexture.index].texture)
            gl.uniform1i(gl.getUniformLocation(program, 'u_sampler'), 0)

            gl.uniform3fv(gl.getUniformLocation(program, 'u_color'), sector.planeColor)
            gl.bindBuffer(gl.ARRAY_BUFFER, sector.floorBuffer)

            gl.enableVertexAttribArray(gl.getAttribLocation(program, 'a_coords'))
            gl.vertexAttribPointer(gl.getAttribLocation(program, 'a_coords'), 3, gl.FLOAT, gl.FALSE, 5 * 4, 0)

            gl.enableVertexAttribArray(gl.getAttribLocation(program, 'a_texcoords'))
            gl.vertexAttribPointer(gl.getAttribLocation(program, 'a_texcoords'), 2, gl.FLOAT, gl.FALSE, 5 * 4, 3 * 4)

            gl.drawArrays(gl.TRIANGLE_FAN, 0, gl.getBufferParameter(gl.ARRAY_BUFFER, gl.BUFFER_SIZE) / 20)
          }

          if (currentLevel.textures[sector.ceilingTexture.index] && !(sector.flags[0] & 0x01 === 0x01)) {
            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, currentLevel.textures[sector.ceilingTexture.index].texture)
            gl.uniform1i(gl.getUniformLocation(program, 'u_sampler'), 0)

            gl.uniform3fv(gl.getUniformLocation(program, 'u_color'), sector.planeColor)
            gl.bindBuffer(gl.ARRAY_BUFFER, sector.ceilingBuffer)

            gl.enableVertexAttribArray(gl.getAttribLocation(program, 'a_coords'))
            gl.vertexAttribPointer(gl.getAttribLocation(program, 'a_coords'), 3, gl.FLOAT, gl.FALSE, 5 * 4, 0)

            gl.enableVertexAttribArray(gl.getAttribLocation(program, 'a_texcoords'))
            gl.vertexAttribPointer(gl.getAttribLocation(program, 'a_texcoords'), 2, gl.FLOAT, gl.FALSE, 5 * 4, 3 * 4)

            gl.drawArrays(gl.TRIANGLE_FAN, 0, gl.getBufferParameter(gl.ARRAY_BUFFER, gl.BUFFER_SIZE) / 20)
          }

          gl.uniform3fv(gl.getUniformLocation(program, 'u_color'), sector.wallColor)
          gl.uniform1i(gl.getUniformLocation(program, 'u_isWall'), 1)
          for (const wall of sector.walls) {
            gl.uniform2f(gl.getUniformLocation(program, 'u_wallSign'), wall.signX, wall.signY)
            if (wall.midBuffer) {
              if (currentLevel.textures[wall.midt]) {
                gl.activeTexture(gl.TEXTURE0)
                gl.bindTexture(gl.TEXTURE_2D, currentLevel.textures[wall.midt].texture)
                gl.uniform1i(gl.getUniformLocation(program, 'u_sampler'), 0)

                gl.bindBuffer(gl.ARRAY_BUFFER, wall.midBuffer)

                gl.enableVertexAttribArray(gl.getAttribLocation(program, 'a_coords'))
                gl.vertexAttribPointer(gl.getAttribLocation(program, 'a_coords'), 3, gl.FLOAT, gl.FALSE, 5 * 4, 0)

                gl.enableVertexAttribArray(gl.getAttribLocation(program, 'a_texcoords'))
                gl.vertexAttribPointer(gl.getAttribLocation(program, 'a_texcoords'), 2, gl.FLOAT, gl.FALSE, 5 * 4, 3 * 4)

                gl.drawArrays(gl.TRIANGLE_FAN, 0, 4)
              }
            } else {
              if (currentLevel.textures[wall.topt]) {
                gl.activeTexture(gl.TEXTURE0)
                gl.bindTexture(gl.TEXTURE_2D, currentLevel.textures[wall.topt].texture)
                gl.uniform1i(gl.getUniformLocation(program, 'u_sampler'), 0)

                gl.bindBuffer(gl.ARRAY_BUFFER, wall.topBuffer)

                gl.enableVertexAttribArray(gl.getAttribLocation(program, 'a_coords'))
                gl.vertexAttribPointer(gl.getAttribLocation(program, 'a_coords'), 3, gl.FLOAT, gl.FALSE, 5 * 4, 0)

                gl.enableVertexAttribArray(gl.getAttribLocation(program, 'a_texcoords'))
                gl.vertexAttribPointer(gl.getAttribLocation(program, 'a_texcoords'), 2, gl.FLOAT, gl.FALSE, 5 * 4, 3 * 4)

                gl.drawArrays(gl.TRIANGLE_FAN, 0, 4)
              }

              if (currentLevel.textures[wall.bottomt]) {
                gl.activeTexture(gl.TEXTURE0)
                gl.bindTexture(gl.TEXTURE_2D, currentLevel.textures[wall.bottomt].texture)
                gl.uniform1i(gl.getUniformLocation(program, 'u_sampler'), 0)

                gl.bindBuffer(gl.ARRAY_BUFFER, wall.bottomBuffer)

                gl.enableVertexAttribArray(gl.getAttribLocation(program, 'a_coords'))
                gl.vertexAttribPointer(gl.getAttribLocation(program, 'a_coords'), 3, gl.FLOAT, gl.FALSE, 5 * 4, 0)

                gl.enableVertexAttribArray(gl.getAttribLocation(program, 'a_texcoords'))
                gl.vertexAttribPointer(gl.getAttribLocation(program, 'a_texcoords'), 2, gl.FLOAT, gl.FALSE, 5 * 4, 3 * 4)

                gl.drawArrays(gl.TRIANGLE_FAN, 0, 4)
              }
            }
          }
        }
      }

      function renderDebug(time) {
        if (cx.canvas.width !== cx.canvas.clientWidth) {
          cx.canvas.width = cx.canvas.clientWidth
        }

        if (cx.canvas.height !== cx.canvas.clientHeight) {
          cx.canvas.height = cx.canvas.clientHeight
        }

        if (!isRenderDebugEnabled) {
          return
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
        //renderDebug(time)

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
