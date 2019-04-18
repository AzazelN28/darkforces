import { vec3, mat4 } from 'gl-matrix'

import level, { getCurrentSector } from './level'

// File Manager
import FileManager from './files/FileManager'

// WebGL imports
import { createTexture2D } from './gl/texture'
import { createVertexBuffer, createIndexBuffer } from './gl/buffer'
import { createProgramFromSource } from './gl/program'

import baseSounds from './audio/sounds'

import { degreesToRadians } from './utils/angle'

const fm = new FileManager()
fm.on('ready', async (fm) => {
  console.log(await fm.fetch('JEDI.LVL'))
  const sounds = await Promise.all(baseSounds.map((sound, index, list) => {
    console.log(`Loading sound ${sound} ${index+1}/${list.length}`)
    return fm.fetch(sound)
  }))
  console.log(sounds)
  const currentLevel = await level.load(fm, 'SECBASE')
  console.log(currentLevel)
  const { fogColor } = currentLevel
  const engine = document.querySelector('canvas#engine')
  const debug = document.querySelector('canvas#debug')
  const gl = engine.getContext('webgl', {
    antialias: false
  })
  const cx = debug.getContext('2d')

  const UP = vec3.fromValues(0, -1, 0)
  const DOWN = vec3.fromValues(0, 1, 0)
  const FORWARD = vec3.fromValues(0, 0, -1)
  const BACKWARD = vec3.fromValues(0, 0, 1)
  const STRAFE_LEFT = vec3.fromValues(-1, 0, 0)
  const STRAFE_RIGHT = vec3.fromValues(1, 0, 0)

  const up = vec3.fromValues(0, -1, 0)
  const down = vec3.fromValues(0, 1, 0)
  const forward = vec3.fromValues(0, 0, -1)
  const backward = vec3.fromValues(0, 0, 1)
  const strafeLeft = vec3.fromValues(-1, 0, 0)
  const strafeRight = vec3.fromValues(1, 0, 0)
  const keys = new Map()
  let zoom = 4.0
  let currentLayer = 0
  let currentSector = null
  const velocity = vec3.create()
  const position = vec3.create()
  const direction = vec3.create()
  const projection = mat4.create()
  const model = mat4.create()
  const view = mat4.create()
  const rotation = mat4.create()
  const projectionView = mat4.create()
  const projectionViewModel = mat4.create()

  // Sets the initial position.
  const { x, y, z, pitch, yaw, roll } = currentLevel.objects.find((object) => object.className === 'spirit')
  console.log(pitch, yaw, roll)
  vec3.set(position, -x, y, z)
  vec3.set(direction, degreesToRadians(pitch), degreesToRadians(yaw + 180), degreesToRadians(roll))

  const program = createProgramFromSource(gl, `
    precision highp float;

    attribute vec3 a_coords;
    attribute vec2 a_texcoords;
    uniform mat4 u_mvp;

    varying vec2 v_texcoords;
    varying float v_depth;

    void main() {
      vec4 position = u_mvp * vec4(a_coords, 1.0);

      gl_Position = vec4(position.x, -position.y, position.z, position.w);

      v_depth = clamp(position.z / 256.0, 0.0, 1.0);
      v_texcoords = a_texcoords;
    }
  `, `
    precision highp float;

    uniform sampler2D u_sampler;
    uniform vec2 u_texbase;
    uniform float u_light;
    uniform vec4 u_fogColor;

    varying vec2 v_texcoords;
    varying float v_depth;

    void main() {
      // Calculates pixel color by using wall/sector light and depth.
      gl_FragColor = mix(
        texture2D(u_sampler, v_texcoords / u_texbase),
        u_fogColor / 256.0,
        v_depth
      ) * u_light;
    }
  `)

  console.log('Uploading buffers...')
  for (const sector of currentLevel.sectors) {
    sector.indexBuffer = createIndexBuffer(gl, new Uint16Array(sector.indices))
    sector.floorBuffer = createVertexBuffer(gl, new Float32Array(sector.floorGeometry))
    sector.ceilingBuffer = createVertexBuffer(gl, new Float32Array(sector.ceilingGeometry))
    sector.walls.forEach((wall) => {
      if (wall.midGeometry) {
        wall.midBuffer = createVertexBuffer(gl, new Float32Array(wall.midGeometry))
      } else {
        wall.topBuffer = createVertexBuffer(gl, new Float32Array(wall.topGeometry))
        wall.bottomBuffer = createVertexBuffer(gl, new Float32Array(wall.bottomGeometry))
      }
    })
  }
  console.log('All buffers uploaded')

  console.log('Uploading textures...')
  for (const texture of currentLevel.textures) {
    if (texture && texture.imageData) {
      console.log(texture.width, texture.height)
      texture.texture = createTexture2D(gl, texture.imageData)
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

    // TODO: Set a max/min zoom level
    if (keys.get('BracketLeft')) {
      if (zoom > 0) {
        zoom--
      }
    } else if (keys.get('BracketRight')) {
      if (zoom < 9) {
        zoom++
      }
    }

    if (keys.get('KeyZ')) {
      if (currentLayer > -9) {
        currentLayer--
      }
    } else if (keys.get('KeyX')) {
      if (currentLayer < 9) {
        currentLayer++
      }
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

    currentSector = getCurrentSector(position, currentLevel.sectors)
    // Change layer automatically to current sector layer.
    if (currentSector !== null) {
      currentLayer = currentSector.layer
    }
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

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

    gl.clearColor(0, 0, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

    gl.disable(gl.CULL_FACE)
    gl.enable(gl.DEPTH_TEST)

    gl.useProgram(program)

    gl.uniform4f(gl.getUniformLocation(program, 'u_fogColor'), ...fogColor)

    const TEXTURE_BASE = 8

    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'u_mvp'), false, projectionView)
    for (const sector of currentLevel.sectors) {
      if (currentLevel.textures[sector.floor.texture.index]) {
        gl.uniform2f(
          gl.getUniformLocation(program, 'u_texbase'),
          currentLevel.textures[sector.floor.texture.index].width / TEXTURE_BASE,
          currentLevel.textures[sector.floor.texture.index].height / TEXTURE_BASE
        )

        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, currentLevel.textures[sector.floor.texture.index].texture)
        gl.uniform1i(gl.getUniformLocation(program, 'u_sampler'), 0)
        gl.uniform1f(gl.getUniformLocation(program, 'u_light'), sector.light)

        gl.bindBuffer(gl.ARRAY_BUFFER, sector.floorBuffer)

        gl.enableVertexAttribArray(gl.getAttribLocation(program, 'a_coords'))
        gl.vertexAttribPointer(gl.getAttribLocation(program, 'a_coords'), 3, gl.FLOAT, gl.FALSE, 5 * 4, 0)

        gl.enableVertexAttribArray(gl.getAttribLocation(program, 'a_texcoords'))
        gl.vertexAttribPointer(gl.getAttribLocation(program, 'a_texcoords'), 2, gl.FLOAT, gl.FALSE, 5 * 4, 3 * 4)

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sector.indexBuffer)

        // gl.drawArrays(gl.TRIANGLE_FAN, 0, sector.floorGeometry.length / 5)
        gl.drawElements(gl.TRIANGLES, sector.indices.length, gl.UNSIGNED_SHORT, 0)
      }

      if (currentLevel.textures[sector.ceiling.texture.index] && !(sector.flags[0] & 0x01 === 0x01)) {
        gl.uniform2f(
          gl.getUniformLocation(program, 'u_texbase'),
          currentLevel.textures[sector.ceiling.texture.index].width / TEXTURE_BASE,
          currentLevel.textures[sector.ceiling.texture.index].height / TEXTURE_BASE
        )

        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, currentLevel.textures[sector.ceiling.texture.index].texture)
        gl.uniform1i(gl.getUniformLocation(program, 'u_sampler'), 0)
        gl.uniform1f(gl.getUniformLocation(program, 'u_light'), sector.light)

        gl.bindBuffer(gl.ARRAY_BUFFER, sector.ceilingBuffer)

        gl.enableVertexAttribArray(gl.getAttribLocation(program, 'a_coords'))
        gl.vertexAttribPointer(gl.getAttribLocation(program, 'a_coords'), 3, gl.FLOAT, gl.FALSE, 5 * 4, 0)

        gl.enableVertexAttribArray(gl.getAttribLocation(program, 'a_texcoords'))
        gl.vertexAttribPointer(gl.getAttribLocation(program, 'a_texcoords'), 2, gl.FLOAT, gl.FALSE, 5 * 4, 3 * 4)

        // gl.drawArrays(gl.TRIANGLE_FAN, 0, sector.ceilingGeometry.length / 5)
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sector.indexBuffer)

        gl.drawElements(gl.TRIANGLES, sector.indices.length, gl.UNSIGNED_SHORT, 0)
      }

      gl.enable(gl.CULL_FACE)
      gl.cullFace(gl.FRONT)

      for (const wall of sector.walls) {
        if (wall.midBuffer) {
          if (currentLevel.textures[wall.midt]) {

            gl.uniform2f(
              gl.getUniformLocation(program, 'u_texbase'),
              currentLevel.textures[wall.midt].width / TEXTURE_BASE,
              currentLevel.textures[wall.midt].height / TEXTURE_BASE
            )

            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, currentLevel.textures[wall.midt].texture)
            gl.uniform1i(gl.getUniformLocation(program, 'u_sampler'), 0)
            gl.uniform1f(gl.getUniformLocation(program, 'u_light'), wall.light)

            gl.bindBuffer(gl.ARRAY_BUFFER, wall.midBuffer)

            gl.enableVertexAttribArray(gl.getAttribLocation(program, 'a_coords'))
            gl.vertexAttribPointer(gl.getAttribLocation(program, 'a_coords'), 3, gl.FLOAT, gl.FALSE, 5 * 4, 0)

            gl.enableVertexAttribArray(gl.getAttribLocation(program, 'a_texcoords'))
            gl.vertexAttribPointer(gl.getAttribLocation(program, 'a_texcoords'), 2, gl.FLOAT, gl.FALSE, 5 * 4, 3 * 4)

            gl.drawArrays(gl.TRIANGLE_FAN, 0, 4)
          }
        } else {
          if (currentLevel.textures[wall.topt]) {

            gl.uniform2f(
              gl.getUniformLocation(program, 'u_texbase'),
              currentLevel.textures[wall.topt].width / TEXTURE_BASE,
              currentLevel.textures[wall.topt].height / TEXTURE_BASE
            )

            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, currentLevel.textures[wall.topt].texture)
            gl.uniform1i(gl.getUniformLocation(program, 'u_sampler'), 0)
            gl.uniform1f(gl.getUniformLocation(program, 'u_light'), wall.light)

            gl.bindBuffer(gl.ARRAY_BUFFER, wall.topBuffer)

            gl.enableVertexAttribArray(gl.getAttribLocation(program, 'a_coords'))
            gl.vertexAttribPointer(gl.getAttribLocation(program, 'a_coords'), 3, gl.FLOAT, gl.FALSE, 5 * 4, 0)

            gl.enableVertexAttribArray(gl.getAttribLocation(program, 'a_texcoords'))
            gl.vertexAttribPointer(gl.getAttribLocation(program, 'a_texcoords'), 2, gl.FLOAT, gl.FALSE, 5 * 4, 3 * 4)

            gl.drawArrays(gl.TRIANGLE_FAN, 0, 4)
          }

          if (currentLevel.textures[wall.bottomt]) {

            gl.uniform2f(
              gl.getUniformLocation(program, 'u_texbase'),
              currentLevel.textures[wall.bottomt].width / TEXTURE_BASE,
              currentLevel.textures[wall.bottomt].height / TEXTURE_BASE
            )

            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, currentLevel.textures[wall.bottomt].texture)
            gl.uniform1i(gl.getUniformLocation(program, 'u_sampler'), 0)
            gl.uniform1f(gl.getUniformLocation(program, 'u_light'), wall.light)

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

    // TODO: We should draw all the sprites in here, we also need to reorder
    // all the objects to do the alpha blending.
    for (const object of currentLevel.objects) {
      if (object.className === 'sprite') {
        /*
        gl.enableVertexAttribArray(gl.getAttribLocation(program, 'a_coords'))
        gl.vertexAttribPointer(gl.getAttribLocation(program, 'a_coords'), 3, gl.FLOAT, gl.FALSE, 5 * 4, 0)

        gl.enableVertexAttribArray(gl.getAttribLocation(program, 'a_texcoords'))
        gl.vertexAttribPointer(gl.getAttribLocation(program, 'a_texcoords'), 2, gl.FLOAT, gl.FALSE, 5 * 4, 3 * 4)

        gl.drawArrays(gl.TRIANGLE_FAN, 0, 4)
        */
      } else if (object.className === '3d') {
        // TODO: We should draw the 3D models in here.
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

    cx.clearRect(0, 0, cx.canvas.width, cx.canvas.height)

    const scx = cx.canvas.width >> 1
    const scy = cx.canvas.height >> 1

    cx.save()
    cx.translate(scx, scy)
    cx.rotate(-direction[1] + Math.PI * 0.5)
    cx.beginPath()
    cx.moveTo(8, 0)
    cx.lineTo(-8, 0)
    cx.lineTo(0, 4)
    cx.lineTo(0, -4)
    cx.lineTo(-8, 0)
    cx.strokeStyle = '#f0f'
    cx.stroke()
    cx.restore()

    cx.save()
    cx.translate(scx - position[0] * zoom, scy - position[2] * zoom)

    for (const sector of currentLevel.sectors) {
      if (sector.layer !== currentLayer) {
        continue
      }

      let mx = 0,
        my = 0

      for (const wall of sector.walls) {
        const [sx, sy] = sector.vertices[wall.left]
        const [ex, ey] = sector.vertices[wall.right]
        cx.beginPath()
        cx.moveTo(sx * zoom, sy * zoom)
        cx.lineTo(ex * zoom, ey * zoom)
        if (sector === currentSector) {
          if (wall.adjoin !== -1) {
            cx.strokeStyle = '#770'
          } else {
            cx.strokeStyle = '#ff0'
          }
        } else {
          if (wall.adjoin !== -1) {
            cx.strokeStyle = '#070'
          } else {
            cx.strokeStyle = '#0f0'
          }
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
      cx.moveTo(-zx, zy - 2)
      cx.lineTo(-zx + 2, zy)
      cx.lineTo(-zx, zy + 2)
      cx.lineTo(-zx - 2, zy)
      cx.closePath()
      cx.stroke()

      cx.beginPath()
      cx.moveTo(-zx, zy)
      cx.lineTo(-zx + Math.cos(degreesToRadians(yaw)) * 4, zy + Math.sin(degreesToRadians(yaw)) * 4)
      cx.stroke()

      cx.font = '16px monospace'
      cx.textAlign = 'center'
      cx.textBaseline = 'middle'
      let accuY = 16
      if (object.typeName) {
        cx.fillText(object.typeName, -zx, zy + accuY)
        accuY += 16
      }
      if (object.logics) {
        for (const logic of object.logics) {
          cx.fillText(logic, -zx, zy + accuY)
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
    cx.fillText('KEYS', 0, 16)
    cx.fillText('[] - Zoom', 0, 32)
    cx.fillText('W,A,S,D - Move', 0, 48)
    cx.fillText('Q,E - Up/Down', 0, 64)
    cx.fillText('Z,X - Up/Down layers', 0, 80)

    if (currentSector !== null) {
      cx.fillText(`Sector ${currentSector.index} ${currentSector.name} ${currentSector.layer}`, 0, 96)
      cx.fillText(`- Flags: ${currentSector.flags.join(', ')}`, 0, 112)
      cx.fillText(`- Light: ${currentSector.light}`, 0, 128)
      cx.fillText(`- Floor: ${currentSector.floor.altitude} ${currentSector.floor.texture.index} ${currentSector.floor.texture.x} ${currentSector.floor.texture.y} ${currentSector.floor.texture.flags.toString(2)}`, 0, 144)
      cx.fillText(`- Ceiling: ${currentSector.ceiling.altitude} ${currentSector.ceiling.texture.index} ${currentSector.ceiling.texture.x} ${currentSector.ceiling.texture.y} ${currentSector.ceiling.texture.flags.toString(2)}`, 0, 160)
    }
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
