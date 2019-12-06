import { vec3, mat4 } from 'gl-matrix'

import level, { getCurrentSector, signedDistanceToWall, isPositionOnWall } from './level'

// File Manager
import FileManager from './files/FileManager'

// WebGL imports
import { createTexture2D } from './gl/texture'
import { createVertexBuffer, createIndexBuffer } from './gl/buffer'
import { createProgramFromSource } from './gl/program'

import sound from './audio/sound'
import baseSounds from './audio/sounds'

import { degreesToRadians } from './utils/angle'
import log from './utils/log'

import touchpad from './input/touchpad'
import keyboard from './input/keyboard'
import gamepad from './input/gamepad'
import mouse from './input/mouse'

import defaultVertexShader from './shaders/default.v.glsl'
import defaultFragmentShader from './shaders/default.f.glsl'

const fm = new FileManager()
fm.on('ready', async (fm) => {
  window.fm = fm
  window.sound = sound

  log.write(await fm.fetch('JEDI.LVL'))
  const sounds = await Promise.all(baseSounds.map((sound, index, list) => {
    log.write(`Loading sound ${sound} ${index+1}/${list.length}`)
    return fm.fetch(sound)
  }))

  window.sounds = sounds

  log.write(sounds)
  log.write(location)
  const url = new URL(location)
  log.write(url.searchParams)

  const levelName = url.searchParams.has('level')
    ? url.searchParams.get('level')
    : 'SECBASE'

  log.write(levelName)
  const currentLevel = await level.load(fm, levelName)
  log.write(currentLevel)

  const { fogColor } = currentLevel
  const engine = document.querySelector('canvas#engine')
  const debug = document.querySelector('canvas#debug')
  const gl = engine.getContext('webgl2', { antialias: false })
  const cx = debug.getContext('2d', { antialias: false })

  const LOOK_UPDOWN_LIMIT = 1.0
  const DEFAULT_ZOOM = 20
  const DEFAULT_LAYER = 0
  const MIN_ZOOM = 0
  const MAX_ZOOM = 20
  const MIN_LAYER = -9
  const MAX_LAYER = 9

  const ORIGIN = vec3.fromValues(0, 0, 0)
  const UP = vec3.fromValues(0, -1, 0)
  const DOWN = vec3.fromValues(0, 1, 0)
  const FORWARD = vec3.fromValues(0, 0, -1)
  const BACKWARD = vec3.fromValues(0, 0, 1)
  const STRAFE_LEFT = vec3.fromValues(-1, 0, 0)
  const STRAFE_RIGHT = vec3.fromValues(1, 0, 0)
  const MOVEMENT_SCALE = 0.1
  const KYLE_HEIGHT = 5.8

  const TEXTURE_BASE = 8

  const DEBUG_VERTEX_SIZE = 4
  const DEBUG_VERTEX_HALF_SIZE = DEBUG_VERTEX_SIZE >> 1

  const up = vec3.fromValues(0, -1, 0)
  const down = vec3.fromValues(0, 1, 0)
  const forward = vec3.fromValues(0, 0, -1)
  const backward = vec3.fromValues(0, 0, 1)
  const strafeLeft = vec3.fromValues(-1, 0, 0)
  const strafeRight = vec3.fromValues(1, 0, 0)
  const scaledMovement = vec3.create()
  let zoom = DEFAULT_ZOOM
  let currentLayer = DEFAULT_LAYER
  let currentSector = null
  const velocity = vec3.create()
  const position = vec3.create()
  const nextPosition = vec3.create()
  const direction = vec3.create()
  const projection = mat4.create()
  const model = mat4.create()
  const view = mat4.create()
  const rotation = mat4.create()
  const projectionView = mat4.create()
  const projectionViewModel = mat4.create()

  const spriteBuffer = createVertexBuffer(gl, new Float32Array([
    -64.0, -64.0, 0.0, 0.0, 0.0,
     64.0, -64.0, 0.0, 1.0, 0.0,
     64.0,  64.0, 0.0, 1.0, 1.0,
    -64.0,  64.0, 0.0, 0.0, 1.0,
  ]))

  // Sets the initial position.
  const { x, y, z, pitch, yaw, roll } = currentLevel.objects.find((object) => object.className === 'spirit')
  for (const object of currentLevel.objects) {
    if (object.className === 'frame') {
      console.log(object)
    }
  }

  log.write(pitch, yaw, roll)
  vec3.set(position, -x, y, z)
  vec3.set(direction, degreesToRadians(pitch), degreesToRadians(yaw + 180), degreesToRadians(roll))

  const program = createProgramFromSource(gl, defaultVertexShader, defaultFragmentShader)

  log.write('Uploading buffers...')
  for (const sector of currentLevel.sectors) {
    sector.indexBuffer = createIndexBuffer(gl, new Uint16Array(sector.indices))
    sector.floor.buffer = createVertexBuffer(gl, new Float32Array(sector.floor.geometry))
    sector.ceiling.buffer = createVertexBuffer(gl, new Float32Array(sector.ceiling.geometry))
    sector.walls.forEach((wall) => {
      if (wall.mid.geometry) {
        wall.mid.buffer = createVertexBuffer(gl, new Float32Array(wall.mid.geometry))
      } else {
        wall.top.buffer = createVertexBuffer(gl, new Float32Array(wall.top.geometry))
        wall.bottom.buffer = createVertexBuffer(gl, new Float32Array(wall.bottom.geometry))
      }
    })
  }
  log.write('All buffers uploaded')

  log.write('Uploading textures...')
  for (const texture of currentLevel.textures) {
    if (texture && texture.imageData) {
      log.write(texture.width, texture.height)
      texture.texture = createTexture2D(gl, texture.imageData)
    }
  }
  log.write('All textures uploaded')

  log.write(currentLevel.frames)
  log.write('Uploading frames')
  for (const frame of currentLevel.frames) {
    frame.texture = createTexture2D(gl, frame.imageData, {
      wrapS: gl.CLAMP_TO_EDGE,
      wrapT: gl.CLAMP_TO_EDGE
    })
  }
  log.write('All frames uploaded')

  log.write('Uploading sprites')
  for (const sprite of currentLevel.sprites) {
    for (const state of sprite.states) {
      for (const angle of state.angles) {
        for (const frame of angle.frames) {
          frame.fme.texture = createTexture2D(gl, frame.fme.imageData, {
            wrapS: gl.CLAMP_TO_EDGE,
            wrapT: gl.CLAMP_TO_EDGE
          })
        }
      }
    }
  }
  log.write('All sprites uploaded')

  window.currentLevel = currentLevel

  function input(time) {
    // Obtenemos el estado de los mandos.
    gamepad.update(time)

    if (mouse.isLocked()) {
      direction[0] += mouse.coords.movement[1] / gl.canvas.height
      direction[1] += -mouse.coords.movement[0] / gl.canvas.width
    } else if (touchpad.isEnabled()) {
      direction[0] += touchpad.rightStick[1] * 0.125
      direction[1] += -touchpad.rightStick[0] * 0.125
    } else if (gamepad.isEnabled()) {
      direction[0] += gamepad.rightStick[1] * 0.125
      direction[1] += -gamepad.rightStick[0] * 0.125
    }

    // TODO: Esto lo que hace es "limitar" la vista del
    // jugador en el eje X, es decir, hacia arriba y hacia
    // abajo. He puesto este límite de momento para probar.
    // TODO: Hacer que esto no esté activo en modo dios pero
    // sí en modo de juego.
    if (direction[0] < -LOOK_UPDOWN_LIMIT) {
      direction[0] = -LOOK_UPDOWN_LIMIT
    } else if (direction[0] > LOOK_UPDOWN_LIMIT) {
      direction[0] = LOOK_UPDOWN_LIMIT
    }

    if (isGameMode) {
      vec3.rotateY(forward, FORWARD, ORIGIN, direction[1])
      vec3.rotateY(backward, BACKWARD, ORIGIN, direction[1])
      vec3.rotateY(strafeLeft, STRAFE_LEFT, ORIGIN, direction[1])
      vec3.rotateY(strafeRight, STRAFE_RIGHT, ORIGIN, direction[1])
    } else {
      vec3.transformMat4(forward, FORWARD, rotation)
      vec3.transformMat4(backward, BACKWARD, rotation)
      vec3.transformMat4(strafeLeft, STRAFE_LEFT, rotation)
      vec3.transformMat4(strafeRight, STRAFE_RIGHT, rotation)
    }

    // Impedimos que el juego vaya excesivamente rápido
    vec3.scale(forward, forward, MOVEMENT_SCALE)
    vec3.scale(backward, backward, MOVEMENT_SCALE)
    vec3.scale(strafeLeft, strafeLeft, MOVEMENT_SCALE)
    vec3.scale(strafeRight, strafeRight, MOVEMENT_SCALE)

    if (touchpad.isPressed('LeftStickLeft')) {
      vec3.scale(scaledMovement, strafeLeft, Math.abs(touchpad.leftStick[0]))
      vec3.add(velocity, velocity, scaledMovement)
    } else if (touchpad.isPressed('LeftStickRight')) {
      vec3.scale(scaledMovement, strafeRight, Math.abs(touchpad.leftStick[0]))
      vec3.add(velocity, velocity, scaledMovement)
    }

    if (touchpad.isPressed('LeftStickUp')) {
      vec3.scale(scaledMovement, forward, Math.abs(touchpad.leftStick[1]))
      vec3.add(velocity, velocity, scaledMovement)
    } else if (touchpad.isPressed('LeftStickDown')) {
      vec3.scale(scaledMovement, backward, Math.abs(touchpad.leftStick[1]))
      vec3.add(velocity, velocity, scaledMovement)
    }

    if (gamepad.isPressed('LeftStickLeft')) {
      vec3.scale(scaledMovement, strafeLeft, Math.abs(gamepad.leftStick[0]))
      vec3.add(velocity, velocity, scaledMovement)
    } else if (gamepad.isPressed('LeftStickRight')) {
      vec3.scale(scaledMovement, strafeRight, Math.abs(gamepad.leftStick[0]))
      vec3.add(velocity, velocity, scaledMovement)
    }

    if (gamepad.isPressed('LeftStickUp')) {
      vec3.scale(scaledMovement, forward, Math.abs(gamepad.leftStick[1]))
      vec3.add(velocity, velocity, scaledMovement)
    } else if (gamepad.isPressed('LeftStickDown')) {
      vec3.scale(scaledMovement, backward, Math.abs(gamepad.leftStick[1]))
      vec3.add(velocity, velocity, scaledMovement)
    }

    // Move forward & backwards
    if (keyboard.isPressed('KeyA')
     || keyboard.isPressed('ArrowLeft')) {
      vec3.add(velocity, velocity, strafeLeft)
    } else if (keyboard.isPressed('KeyD')
            || keyboard.isPressed('ArrowRight')) {
      vec3.add(velocity, velocity, strafeRight)
    }

    // Strafe left & right
    if (keyboard.isPressed('KeyW')
     || keyboard.isPressed('ArrowUp')) {
      vec3.add(velocity, velocity, forward)
    } else if (keyboard.isPressed('KeyS')
            || keyboard.isPressed('ArrowDown')
            || touchpad.isPressed('LeftStickDown')) {
      vec3.add(velocity, velocity, backward)
    }

    // Move up & down
    if (keyboard.isPressed('KeyQ')
     || keyboard.isPressed('PageUp')) {
      vec3.add(velocity, velocity, up)
    } else if (keyboard.isPressed('KeyE') || keyboard.isPressed('PageDown')) {
      vec3.add(velocity, velocity, down)
    }

    // TODO: Set a max/min zoom level
    if (keyboard.isPressed('BracketLeft')) {
      if (zoom > MIN_ZOOM) {
        zoom--
      }
    } else if (keyboard.isPressed('BracketRight')) {
      if (zoom < MAX_ZOOM) {
        zoom++
      }
    }

    if (keyboard.isPressed('KeyZ')) {
      if (currentLayer > MIN_LAYER) {
        currentLayer--
      }
    } else if (keyboard.isPressed('KeyX')) {
      if (currentLayer < MAX_LAYER) {
        currentLayer++
      }
    }

    if (keyboard.isPressed('KeyR')) {
      mouse.lock(gl.canvas)
    }
  }

  function update() {

    if (isGameMode) {

      if (currentSector === null) {
        currentSector = getCurrentSector(position, currentLevel.sectors)
        if (currentSector === null) {
          throw new Error('Invalid level')
        }
      }

      if (currentSector.floor.altitude > position[1] + KYLE_HEIGHT) {
        velocity[1] += 0.1
      } else {
        position[1] = currentSector.floor.altitude - KYLE_HEIGHT
      }

      vec3.add(nextPosition, position, velocity)
      vec3.scale(velocity, velocity, 0.9)

      // Por cada pared del sector actual...
      for (const wall of currentSector.walls) {

        // Proyectamos el punto sobre la pared para saber si
        // el punto está contenido dentro de la pared.
        const isOnWall = isPositionOnWall(nextPosition, currentSector, wall)
        if (isOnWall) {

          // Si el punto está contenido dentro de la pared entonces
          // obtenemos la distancia del punto a la pared para saber si
          // el punto colisiona con la pared.
          const distance = wall.distance = signedDistanceToWall(nextPosition, currentSector, wall)

          // Si la pared es "caminable" entonces lo que hacemos es
          // tener en cuenta si la distancia es mayor o igual a 0,
          // si es así, significa que hemos atravesado el portal y
          // que nos encontramos al otro lado del portal.
          if (wall.walk !== -1 && distance >= 0) {

            // Obtenemos el nuevo sector.
            const nextSector = currentLevel.sectors[wall.walk]

            // Y ajustamos la altura.
            if (nextSector.floor.altitude < position[1]) {
              position[1] = nextSector.floor.altitude + KYLE_HEIGHT
            }

            // Actualizamos el sector.
            currentSector = nextSector
            break

          // Esta pared no se puede atravesar, así que
          // comprobamos a qué distancia se encuentra
          // y "empujamos" al jugador hacia fuera.
          } else if (distance > -0.5) {

            nextPosition[0] += wall.normal[0] * 0.1
            nextPosition[2] += wall.normal[1] * 0.1

          }
        }
      }

      currentLayer = currentSector.layer

      vec3.copy(position, nextPosition)

    } else {

      vec3.add(position, position, velocity)
      vec3.scale(velocity, velocity, 0.9)

      // This function retrieves the current sector.
      currentSector = getCurrentSector(position, currentLevel.sectors)

      // Change layer automatically to current sector layer if
      // currentSector is different to null.
      if (currentSector !== null) {
        currentLayer = currentSector.layer
      }
    }
  }

  let isDirty = false
  let isGameMode = true
  let isRenderEnabled = true
  let isRenderFloorEnabled = true
  let isRenderCeilingEnabled = true
  let isRenderWallsEnabled = true
  let isRenderObjectsEnabled = true
  let isRenderBoundingRectsEnabled = true
  let isRenderWallIndexEnabled = true
  let isRenderOnlyCurrentLayer = true
  let isRenderOnlyCurrentSector = true
  let isDebugEnabled = true

  function renderPlanes() {
    // TODO: Move this to a function called render sectors.
    for (const sector of currentLevel.sectors) {
      if (sector.layer !== currentLayer && isRenderOnlyCurrentLayer) {
        continue
      }

      if (sector !== currentSector && isRenderOnlyCurrentSector) {
        continue
      }

      // If there's floor texture, then we should render floor plane.
      if (isRenderFloorEnabled
       && currentLevel.textures[sector.floor.texture.index]) {
        gl.uniform2f(
          gl.getUniformLocation(program, 'u_texbase'),
          currentLevel.textures[sector.floor.texture.index].width / TEXTURE_BASE,
          currentLevel.textures[sector.floor.texture.index].height / TEXTURE_BASE
        )

        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, currentLevel.textures[sector.floor.texture.index].texture)
        gl.uniform1i(gl.getUniformLocation(program, 'u_sampler'), 0)
        gl.uniform1f(gl.getUniformLocation(program, 'u_light'), sector.light)

        gl.bindBuffer(gl.ARRAY_BUFFER, sector.floor.buffer)

        gl.enableVertexAttribArray(gl.getAttribLocation(program, 'a_coords'))
        gl.vertexAttribPointer(gl.getAttribLocation(program, 'a_coords'), 3, gl.FLOAT, gl.FALSE, 5 * 4, 0)

        gl.enableVertexAttribArray(gl.getAttribLocation(program, 'a_texcoords'))
        gl.vertexAttribPointer(gl.getAttribLocation(program, 'a_texcoords'), 2, gl.FLOAT, gl.FALSE, 5 * 4, 3 * 4)

        // gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sector.indexBuffer)

        gl.drawArrays(gl.TRIANGLE_FAN, 0, sector.floor.geometry.length / 5)
        // gl.drawElements(gl.TRIANGLES, sector.indices.length, gl.UNSIGNED_SHORT, 0)
      }

      // If there's ceiling texture then we should rendering this sector.
      if (isRenderCeilingEnabled
       && currentLevel.textures[sector.ceiling.texture.index]
       && !(sector.flags[0] & 0x01 === 0x01)) {
        gl.uniform2f(
          gl.getUniformLocation(program, 'u_texbase'),
          currentLevel.textures[sector.ceiling.texture.index].width / TEXTURE_BASE,
          currentLevel.textures[sector.ceiling.texture.index].height / TEXTURE_BASE
        )

        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, currentLevel.textures[sector.ceiling.texture.index].texture)
        gl.uniform1i(gl.getUniformLocation(program, 'u_sampler'), 0)
        gl.uniform1f(gl.getUniformLocation(program, 'u_light'), sector.light)

        gl.bindBuffer(gl.ARRAY_BUFFER, sector.ceiling.buffer)

        gl.enableVertexAttribArray(gl.getAttribLocation(program, 'a_coords'))
        gl.vertexAttribPointer(gl.getAttribLocation(program, 'a_coords'), 3, gl.FLOAT, gl.FALSE, 5 * 4, 0)

        gl.enableVertexAttribArray(gl.getAttribLocation(program, 'a_texcoords'))
        gl.vertexAttribPointer(gl.getAttribLocation(program, 'a_texcoords'), 2, gl.FLOAT, gl.FALSE, 5 * 4, 3 * 4)

        gl.drawArrays(gl.TRIANGLE_FAN, 0, sector.ceiling.geometry.length / 5)
        // gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sector.indexBuffer)

        // gl.drawElements(gl.TRIANGLES, sector.indices.length, gl.UNSIGNED_SHORT, 0)
      }

      // Renderiza las paredes del sector.
      if (isRenderWallsEnabled) {
        renderWalls(sector)
      }
    }
  }

  /**
   * Renderiza las paredes de un sector
   * @param {Sector} sector
   */
  function renderWalls(sector) {
    // TODO: Move this code to a function called renderWalls
    for (const wall of sector.walls) {
      if (wall.mid.buffer) {
        if (currentLevel.textures[wall.mid.texture]) {

          gl.uniform2f(
            gl.getUniformLocation(program, 'u_texbase'),
            currentLevel.textures[wall.mid.texture].width / TEXTURE_BASE,
            currentLevel.textures[wall.mid.texture].height / TEXTURE_BASE
          )

          gl.activeTexture(gl.TEXTURE0)
          gl.bindTexture(gl.TEXTURE_2D, currentLevel.textures[wall.mid.texture].texture)
          gl.uniform1i(gl.getUniformLocation(program, 'u_sampler'), 0)
          gl.uniform1f(gl.getUniformLocation(program, 'u_light'), wall.light)

          gl.bindBuffer(gl.ARRAY_BUFFER, wall.mid.buffer)

          gl.enableVertexAttribArray(gl.getAttribLocation(program, 'a_coords'))
          gl.vertexAttribPointer(gl.getAttribLocation(program, 'a_coords'), 3, gl.FLOAT, gl.FALSE, 5 * 4, 0)

          gl.enableVertexAttribArray(gl.getAttribLocation(program, 'a_texcoords'))
          gl.vertexAttribPointer(gl.getAttribLocation(program, 'a_texcoords'), 2, gl.FLOAT, gl.FALSE, 5 * 4, 3 * 4)

          gl.drawArrays(gl.TRIANGLE_FAN, 0, 4)
        }
      } else {
        if (currentLevel.textures[wall.top.texture]) {

          gl.uniform2f(
            gl.getUniformLocation(program, 'u_texbase'),
            currentLevel.textures[wall.top.texture].width / TEXTURE_BASE,
            currentLevel.textures[wall.top.texture].height / TEXTURE_BASE
          )

          gl.activeTexture(gl.TEXTURE0)
          gl.bindTexture(gl.TEXTURE_2D, currentLevel.textures[wall.top.texture].texture)
          gl.uniform1i(gl.getUniformLocation(program, 'u_sampler'), 0)
          gl.uniform1f(gl.getUniformLocation(program, 'u_light'), wall.light)

          gl.bindBuffer(gl.ARRAY_BUFFER, wall.top.buffer)

          gl.enableVertexAttribArray(gl.getAttribLocation(program, 'a_coords'))
          gl.vertexAttribPointer(gl.getAttribLocation(program, 'a_coords'), 3, gl.FLOAT, gl.FALSE, 5 * 4, 0)

          gl.enableVertexAttribArray(gl.getAttribLocation(program, 'a_texcoords'))
          gl.vertexAttribPointer(gl.getAttribLocation(program, 'a_texcoords'), 2, gl.FLOAT, gl.FALSE, 5 * 4, 3 * 4)

          gl.drawArrays(gl.TRIANGLE_FAN, 0, 4)
        }

        if (currentLevel.textures[wall.bottom.texture]) {

          gl.uniform2f(
            gl.getUniformLocation(program, 'u_texbase'),
            currentLevel.textures[wall.bottom.texture].width / TEXTURE_BASE,
            currentLevel.textures[wall.bottom.texture].height / TEXTURE_BASE
          )

          gl.activeTexture(gl.TEXTURE0)
          gl.bindTexture(gl.TEXTURE_2D, currentLevel.textures[wall.bottom.texture].texture)
          gl.uniform1i(gl.getUniformLocation(program, 'u_sampler'), 0)
          gl.uniform1f(gl.getUniformLocation(program, 'u_light'), wall.light)

          gl.bindBuffer(gl.ARRAY_BUFFER, wall.bottom.buffer)

          gl.enableVertexAttribArray(gl.getAttribLocation(program, 'a_coords'))
          gl.vertexAttribPointer(gl.getAttribLocation(program, 'a_coords'), 3, gl.FLOAT, gl.FALSE, 5 * 4, 0)

          gl.enableVertexAttribArray(gl.getAttribLocation(program, 'a_texcoords'))
          gl.vertexAttribPointer(gl.getAttribLocation(program, 'a_texcoords'), 2, gl.FLOAT, gl.FALSE, 5 * 4, 3 * 4)

          gl.drawArrays(gl.TRIANGLE_FAN, 0, 4)
        }
      }
    }
  }

  /**
   * Renders objects
   */
  function renderObjects() {
    if (!isRenderObjectsEnabled) {
      return
    }

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null)

    // TODO: We should draw all the sprites in here, we also need to reorder
    // all the objects to do the alpha blending.
    for (const object of currentLevel.objects) {

      if (object.className === 'sprite'
       || object.className === 'frame') {

        const { x, y, z } = object

        /*
        vec3.set(position, x, y, z)

        mat4.identity(model)
        mat4.translate(model, model, position)
        // mat4.multiply(model, model, rotation)
        // mat4.invert(view, model)
        mat4.multiply(projectionView, projection, view)

        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'u_mvp'), false, projectionViewModel)
        */

        gl.uniform2f(
          gl.getUniformLocation(program, 'u_texbase'),
          1.0,
          1.0
        )

        gl.activeTexture(gl.TEXTURE0)

        if (object.className === 'frame') {
          gl.bindTexture(gl.TEXTURE_2D, currentLevel.frames[object.data].texture)
        } else if (object.className === 'sprite') {
          gl.bindTexture(gl.TEXTURE_2D, currentLevel.sprites[object.data].states[0].angles[0].frames[0].fme.texture)
        }
        //gl.bindTexture(gl.TEXTURE_2D, currentLevel.textures[sector.floor.texture.index].texture)

        gl.uniform1i(gl.getUniformLocation(program, 'u_sampler'), 0)
        gl.uniform1f(gl.getUniformLocation(program, 'u_light'), 1.0)

        gl.bindBuffer(gl.ARRAY_BUFFER, spriteBuffer)

        gl.enableVertexAttribArray(gl.getAttribLocation(program, 'a_coords'))
        gl.vertexAttribPointer(gl.getAttribLocation(program, 'a_coords'), 3, gl.FLOAT, gl.FALSE, 5 * 4, 0)

        gl.enableVertexAttribArray(gl.getAttribLocation(program, 'a_texcoords'))
        gl.vertexAttribPointer(gl.getAttribLocation(program, 'a_texcoords'), 2, gl.FLOAT, gl.FALSE, 5 * 4, 3 * 4)

        gl.drawArrays(gl.TRIANGLE_FAN, 0, 4)

      } else if (object.className === '3d') {

        // TODO: We should draw the 3D models in here.

      }
    }
  }

  /**
   * Renders everything.
   */
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

      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

      isDirty = false
    }

    mat4.identity(rotation)
    mat4.rotateY(rotation, rotation, direction[1])
    mat4.rotateX(rotation, rotation, direction[0])

    mat4.identity(model)
    mat4.translate(model, model, position)
    mat4.multiply(model, model, rotation)
    mat4.invert(view, model)
    mat4.multiply(projectionView, projection, view)

    gl.clearColor(0, 0, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.STENCIL_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

    gl.disable(gl.CULL_FACE)
    gl.enable(gl.DEPTH_TEST)

    gl.useProgram(program)

    gl.uniform4f(gl.getUniformLocation(program, 'u_fogColor'), ...fogColor)

    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'u_mvp'), false, projectionView)

    /**
     * @see https: //stackoverflow.com/questions/25422846/how-to-force-opengl-to-draw-a-non-convex-filled-polygon
     * @see http: //www.glprogramming.com/red/chapter14.html#name13

    gl.enable(gl.STENCIL_TEST)
    gl.colorMask(gl.FALSE, gl.FALSE, gl.FALSE, gl.FALSE)
    gl.stencilFunc(gl.ALWAYS, 0, 1)
    gl.stencilOp(gl.KEEP, gl.KEEP, gl.INVERT)
    gl.stencilMask(1)

    renderPlanes()

    gl.colorMask(gl.TRUE, gl.TRUE, gl.TRUE, gl.TRUE)
    gl.stencilFunc(gl.EQUAL, 1, 1)
    gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP)

    */

    renderPlanes()

    // gl.disable(gl.STENCIL_TEST)

    // gl.enable(gl.CULL_FACE)
    // gl.cullFace(gl.FRONT)

    renderObjects()

  }

  /**
   * Renders debug information
   * @param {number} time
   */
  function renderDebug(time) {
    if (cx.canvas.width !== cx.canvas.clientWidth) {
      cx.canvas.width = cx.canvas.clientWidth
    }

    if (cx.canvas.height !== cx.canvas.clientHeight) {
      cx.canvas.height = cx.canvas.clientHeight
    }

    cx.clearRect(0, 0, cx.canvas.width, cx.canvas.height)

    log.render(cx)

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
      if (sector.layer !== currentLayer && isRenderOnlyCurrentLayer) {
        continue
      }

      if (sector !== currentSector && isRenderOnlyCurrentSector) {
        continue
      }

      let mx = 0
        , my = 0

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

        if (isRenderWallIndexEnabled) {
          const tx = sx + (ex - sx) * 0.5
          const ty = sy + (ey - sy) * 0.5
          cx.font = '16px monospace'
          cx.textAlign = 'center'
          cx.textBaseline = 'middle'
          cx.fillStyle = '#fff'
          cx.fillText(`${wall.index} ${wall.distance && wall.distance.toFixed(2)}`, tx * zoom, ty * zoom)
        }
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

      // Renders the bounding box of the current sector.
      if (isRenderBoundingRectsEnabled) {
        cx.strokeStyle = sector === currentSector ? '#fff' : '#777'
        cx.strokeRect(
          sector.boundingRect[0] * zoom,
          sector.boundingRect[2] * zoom,
          sector.boundingRect[4] * zoom,
          sector.boundingRect[5] * zoom,
        )
      }

      for (const [x, y] of sector.vertices) {
        const zx = x * zoom
        const zy = y * zoom
        /*
        cx.beginPath()
        cx.moveTo(zx, zy - 2)
        cx.lineTo(zx + 2, zy)
        cx.lineTo(zx, zy + 2)
        cx.lineTo(zx - 2, zy)
        cx.fillStyle = '#0ff'
        cx.fill()
        */
        cx.fillRect(zx - DEBUG_VERTEX_HALF_SIZE, zy - DEBUG_VERTEX_HALF_SIZE, DEBUG_VERTEX_SIZE, DEBUG_VERTEX_SIZE)
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

    let textY = 0
    cx.fillText(`${frameID} ${time}`, 0, textY += 16)

    // TODO: Esto debería mandarlo a otra parte
    // de la interfaz.
    cx.fillText('KEYS', 0, textY += 16)
    cx.fillText('[] - Zoom', 0, textY += 16)
    cx.fillText(`W,A,S,D - Move ${gamepad.leftStick.join(',')}, ${gamepad.rightStick.join(',')}`, 0, textY += 16)
    cx.fillText('Q,E - Up/Down', 0, textY += 16)
    cx.fillText('Z,X - Up/Down layers', 0, textY += 16)

    cx.fillText(`${position.join(', ')}`, 0, textY += 16)
    if (currentSector !== null) {
      cx.fillText(`Sector ${currentSector.index} ${currentSector.name} ${currentSector.layer}`, 0, textY += 16)
      cx.fillText(`- Flags: ${currentSector.flags.join(', ')}`, 0, textY += 16)
      cx.fillText(`- Light: ${currentSector.light}`, 0, textY += 16)
      cx.fillText(`- Floor: ${currentSector.floor.altitude} ${currentSector.floor.texture.index} ${currentSector.floor.texture.x} ${currentSector.floor.texture.y} ${currentSector.floor.texture.flags.toString(2)}`, 0, textY += 16)
      cx.fillText(`- Ceiling: ${currentSector.ceiling.altitude} ${currentSector.ceiling.texture.index} ${currentSector.ceiling.texture.x} ${currentSector.ceiling.texture.y} ${currentSector.ceiling.texture.flags.toString(2)}`, 0, textY += 16)
      cx.fillText(`- Rect: ${currentSector.boundingRect.join(', ')}`, 0, textY += 16)
      cx.fillText(`- Box: ${currentSector.boundingBox.join(', ')}`, 0, textY += 16)
    }

    cx.putImageData(currentLevel.frames[1].imageData, 0, 0)
  }

  let frameID

  function frame(time) {
    input(time)
    update(time)

    if (isRenderEnabled) {
      render(time)
    }

    if (isDebugEnabled) {
      renderDebug(time)
    }

    frameID = window.requestAnimationFrame(frame)
  }

  function start() {
    mouse.start()
    touchpad.start()
    keyboard.start()
    gamepad.start()

    const fullScreenButton = document.querySelector('#full-screen-button')
    fullScreenButton.onclick = () => {
      mouse.lock(document.body).then(() => document.body.requestFullscreen())
    }

    debug.onclick = () => mouse.lock(document.body)

    frameID = window.requestAnimationFrame(frame)
  }

  start()

})
