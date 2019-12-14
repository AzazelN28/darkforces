import { vec2, vec3, mat4 } from 'gl-matrix'

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

import stencilVertexShader from './shaders/stencil.v.glsl'
import stencilFragmentShader from './shaders/stencil.f.glsl'

import spriteVertexShader from './shaders/sprite.v.glsl'
import spriteFragmentShader from './shaders/sprite.f.glsl'

import meshVertexShader from './shaders/mesh.v.glsl'
import meshFragmentShader from './shaders/mesh.f.glsl'

import { approximateToZero } from './utils/range'

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
  const gl = engine.getContext('webgl2', { antialias: false, stencil: true })
  const cx = debug.getContext('2d', { antialias: false })

  console.log('Stencil bits', gl.getParameter(gl.STENCIL_BITS))

  const LOOK_UPDOWN_LIMIT = 1.0
  const DEFAULT_ZOOM = 20
  const DEFAULT_LAYER = 0
  const MIN_ZOOM = 0
  const MAX_ZOOM = 20
  const MIN_LAYER = -9
  const MAX_LAYER = 9
  const MAX_VISIBLE_SECTORS = 128
  const GRAVITY = 0.06

  const ORIGIN = vec3.fromValues(0, 0, 0)
  const UP = vec3.fromValues(0, -1, 0)
  const DOWN = vec3.fromValues(0, 1, 0)
  const FORWARD = vec3.fromValues(0, 0, -1)
  const BACKWARD = vec3.fromValues(0, 0, 1)
  const STRAFE_LEFT = vec3.fromValues(-1, 0, 0)
  const STRAFE_RIGHT = vec3.fromValues(1, 0, 0)
  const MOVEMENT_SCALE = 0.05
  const KYLE_HEIGHT = 5.8

  const TEXTURE_BASE = 8

  const DEBUG_VERTEX_SIZE = 4
  const DEBUG_VERTEX_HALF_SIZE = DEBUG_VERTEX_SIZE >> 1

  let zoom = DEFAULT_ZOOM
  let previousTime = 0

  // Información del jugador.
  let currentLayer = DEFAULT_LAYER
  let currentSector = null

  let isJumping = false

  /*
  const mediaRecorder = new MediaRecorder(engine.captureStream(60))
  let isRecording = false
  let mediaChunks = []
  mediaRecorder.ondataavailable = (e) => {
    mediaChunks.push(e.data)
  }
  mediaRecorder.onstart = () => {
    isRecording = true
  }
  mediaRecorder.onstop = () => {
    isRecording = false
    const blob = new Blob(mediaChunks, { type: mediaRecorder.mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'df.mp4'
    a.dispatchEvent(new MouseEvent('click'))
  }
  */

  const currentSectors = new Set()
  const sectorsToVisit = []
  const visibleSectors = new Set()
  const visibleWalls = new Set()

  // Player ammunition.
  const ammo = {
    energy: 100, // pistol, blaster rifle
    cells: 0, // imperial repeater gun, jeron fusion cutter, stouker concussion rifle
    shells: 0, // packered mortar gun
    plasma: 0, // assault cannon
    missiles: 0, // assault cannon
    thermalDetonators: 0, // thermal detonators
    mines: 0 // mines
  }

  const inventory = [
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false
  ]

  // Player weapons
  const weapons = [
    true,   // 0 - This should be always true
    true,   // 1
    false,  // 2
    false,  // 3
    false,  // 4
    false,  // 5
    false,  // 6
    false,  // 7
    false,  // 8
    false   // 9
  ]

  const Inventory = {
    DEATH_STAR_PLANS: 0,
    DT_WEAPON: 1,
    DATA_TAPE: 2,
    NAVA_KEY: 3,
    PHRIK_METAL: 4,
    GAS_MASK: 5,
    ICE_CLEATS: 6,
    IR_GOGGLES: 7,
    RED_KEY: 8,
    YELLOW_KEY: 9,
    BLUE_KEY: 10,
    CODE_1: 11,
    CODE_2: 12,
    CODE_3: 13,
    CODE_4: 14,
    CODE_5: 15,
    CODE_6: 16,
    CODE_7: 17,
    CODE_8: 18,
    CODE_9: 19
  }

  const Weapon = {
    FIST: 0,
    BRYAR_PISTOL: 1,
    BLASTER_RIFLE: 2,
    THERMAL_DETONATOR: 3,
    IMPERIAL_REPEATER_GUN: 4,
    JERON_FUSION_CUTTER: 5,
    MINES: 6,
    STOUKER_CONCUSSION_RIFLE: 7,
    PACKERED_MORTAR_GUN: 8,
    ASSAULT_CANNON: 9
  }

  let currentWeapon = Weapon.BRYAR_PISTOL

  let shield = 100
  let health = 100
  let battery = 100

  const up = vec3.fromValues(0, -1, 0)
  const down = vec3.fromValues(0, 1, 0)
  const forward = vec3.fromValues(0, 0, -1)
  const backward = vec3.fromValues(0, 0, 1)
  const strafeLeft = vec3.fromValues(-1, 0, 0)
  const strafeRight = vec3.fromValues(1, 0, 0)
  const scaledMovement = vec3.create()
  const velocity = vec3.create()
  const position = vec3.create()
  const nextPosition = vec3.create()
  const viewAngles = vec3.create()
  const direction = vec2.create()
  const projection = mat4.create()
  const model = mat4.create()
  const view = mat4.create()
  const rotation = mat4.create()
  const projectionView = mat4.create()

  /*
  const spriteBuffer = createVertexBuffer(gl, new Float32Array([
    0.0, 0.0, 0.0, 0.0, 0.0
  ]))
  */
  const spriteBuffer = createVertexBuffer(gl, new Float32Array([
    -1.0, -2.0, 0.0, 0.0, 0.0,
     1.0, -2.0, 0.0, 1.0, 0.0,
     1.0,  0.0, 0.0, 1.0, 1.0,
    -1.0,  0.0, 0.0, 0.0, 1.0,
  ]))

  // Sets the initial position.
  const { position: [x, y, z], rotation: [pitch, yaw, roll] } = currentLevel.objects.find((object) => object.className === 'spirit')

  log.write(pitch, yaw, roll)

  vec3.set(position, -x, y, z)
  vec3.set(viewAngles, degreesToRadians(pitch), degreesToRadians(yaw + 180), degreesToRadians(roll))

  const defaultProgram = createProgramFromSource(gl, defaultVertexShader, defaultFragmentShader)
  const defaultProgramAttributes = {
    a_coords: gl.getAttribLocation(defaultProgram, 'a_coords'),
    a_texcoords: gl.getAttribLocation(defaultProgram, 'a_texcoords')
  }
  const defaultProgramUniforms = {
    u_mvp: gl.getUniformLocation(defaultProgram, 'u_mvp'),
    u_sampler: gl.getUniformLocation(defaultProgram, 'u_sampler'),
    u_texbase: gl.getUniformLocation(defaultProgram, 'u_texbase'),
    u_light: gl.getUniformLocation(defaultProgram, 'u_light'),
    u_fogColor: gl.getUniformLocation(defaultProgram, 'u_fogColor')
  }
  const stencilProgram = createProgramFromSource(gl, stencilVertexShader, stencilFragmentShader)
  const spriteProgram = createProgramFromSource(gl, spriteVertexShader, spriteFragmentShader)
  const spriteProgramAttributes = {
    a_coords: gl.getAttribLocation(spriteProgram, 'a_coords'),
    a_texcoords: gl.getAttribLocation(spriteProgram, 'a_texcoords')
  }
  const spriteProgramUniforms = {
    u_mvp: gl.getUniformLocation(spriteProgram, 'u_mvp'),
    u_size: gl.getUniformLocation(spriteProgram, 'u_size')
  }
  const meshProgram = createProgramFromSource(gl, meshVertexShader, meshFragmentShader)
  const meshProgramAttributes = {
    a_coords: gl.getAttribLocation(meshProgram, 'a_coords'),
    a_texcoords: gl.getAttribLocation(meshProgram, 'a_texcoords')
  }
  const meshProgramUniforms = {
    u_mvp: gl.getUniformLocation(meshProgram, 'u_mvp'),
    u_size: gl.getUniformLocation(meshProgram, 'u_size')
  }

  log.write('Uploading meshes...')
  for (const mesh of currentLevel.meshes) {
    for (const object of mesh.objects) {
      const indices = []
      for (const quad of object.quads) {
        const [a, b, c, d] = quad
        indices.push(a, b, c)
        indices.push(a, c, d)
      }
      for (const triangle of object.triangles) {
        const [a, b, c] = triangle
        indices.push(a, b, c)
      }
      object.indices = indices
      object.vertices = object.vertices.reduce((previous, current) => previous.concat(current), [])
      object.indexBuffer = createIndexBuffer(gl, new Uint16Array(object.indices))
      object.vertexBuffer = createVertexBuffer(gl, new Float32Array(object.vertices))
      console.log(object)
    }
  }
  log.write('All meshes uploaded')

  log.write('Uploading buffers...')
  for (const sector of currentLevel.sectors) {
    sector.indexBuffer = createIndexBuffer(gl, new Uint16Array(sector.indices))
    sector.floor.vertexBuffer = createVertexBuffer(gl, new Float32Array(sector.floor.geometry))
    sector.ceiling.vertexBuffer = createVertexBuffer(gl, new Float32Array(sector.ceiling.geometry))
    sector.walls.forEach((wall) => {
      if (wall.mid.geometry) {
        wall.mid.vertexBuffer = createVertexBuffer(gl, new Float32Array(wall.mid.geometry))
      } else {
        wall.top.vertexBuffer = createVertexBuffer(gl, new Float32Array(wall.top.geometry))
        wall.bottom.vertexBuffer = createVertexBuffer(gl, new Float32Array(wall.bottom.geometry))
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
  for (const [, frame] of currentLevel.frames) {
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

  /**
   *
   * @param {number} time
   */
  function input(time) {
    // Updates gamepad state
    gamepad.update(time)

    if (mouse.isLocked()) {
      viewAngles[0] += mouse.coords.movement[1] / gl.canvas.height
      viewAngles[1] += -mouse.coords.movement[0] / gl.canvas.width
    } else if (touchpad.isEnabled()) {
      viewAngles[0] += touchpad.rightStick[1] * 0.125
      viewAngles[1] += -touchpad.rightStick[0] * 0.125
    } else if (gamepad.isEnabled()) {
      viewAngles[0] += gamepad.rightStick[1] * 0.125
      viewAngles[1] += -gamepad.rightStick[0] * 0.125
    }

    if (isGameMode) {
      if (viewAngles[0] < -LOOK_UPDOWN_LIMIT) {
        viewAngles[0] = -LOOK_UPDOWN_LIMIT
      } else if (viewAngles[0] > LOOK_UPDOWN_LIMIT) {
        viewAngles[0] = LOOK_UPDOWN_LIMIT
      }
    }

    vec2.set(direction, Math.cos(-viewAngles[1] + Math.PI * 0.5), Math.sin(-viewAngles[1] + Math.PI * 0.5))

    if (isGameMode) {
      vec3.rotateY(forward, FORWARD, ORIGIN, viewAngles[1])
      vec3.rotateY(backward, BACKWARD, ORIGIN, viewAngles[1])
      vec3.rotateY(strafeLeft, STRAFE_LEFT, ORIGIN, viewAngles[1])
      vec3.rotateY(strafeRight, STRAFE_RIGHT, ORIGIN, viewAngles[1])
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
    } else if (keyboard.isPressed('KeyE')
            || keyboard.isPressed('PageDown')) {
      vec3.add(velocity, velocity, down)
    }

    if (keyboard.isPressed('Space')) {
      if (!isJumping) {
        isJumping = true
        velocity[1] = -1
      }
    }

    if (keyboard.isPressed('KeyR')) {
      mouse.lock(gl.canvas)
    }

    mouse.update(time)

  }

  /**
   * Actualizamos el comportamiento del juego.
   */
  function update(time) {

    if (isGameMode) {

      /*
      if (currentSectors.size === 0) {
        const currentSector = getCurrentSector(position, currentLevel.sectors)
        if (currentSector === null) {
          throw new Error('Invalid level')
        }
        currentSectors.add(currentSector)
      }
      */

      if (currentSector === null) {
        currentSector = getCurrentSector(position, currentLevel.sectors)
        if (currentSector === null) {
          throw new Error('Invalid level')
        }
      }

      if (currentSector.floor.altitude > position[1] + KYLE_HEIGHT) {
        velocity[1] += GRAVITY
      }

      if (currentSector.floor.altitude <= position[1] + KYLE_HEIGHT) {
        position[1] = currentSector.floor.altitude - KYLE_HEIGHT
        isJumping = false
      }

      vec3.add(nextPosition, position, velocity)
      vec3.scale(velocity, velocity, 0.9)
      approximateToZero(velocity[0], 0.01)
      approximateToZero(velocity[1], 0.01)
      approximateToZero(velocity[2], 0.01)

      // Esto debería ser algo así como "checkSectorCollisions"
      // Por cada pared del sector actual...
      for (const wall of currentSector.walls) {

        // Proyectamos el punto sobre la pared para saber si
        // el punto está contenido dentro de la pared.
        const isOnWall = isPositionOnWall(nextPosition, currentSector, wall)
        if (!isOnWall) {
          continue
        }

        // Si el punto está contenido dentro de la pared entonces
        // obtenemos la distancia del punto a la pared para saber si
        // el punto colisiona con la pared.
        const distance = wall.distance = signedDistanceToWall(nextPosition, currentSector, wall)

        // Si la pared es "caminable" entonces lo que hacemos es
        // tener en cuenta si la distancia es mayor o igual a 0,
        // si es así, significa que hemos atravesado el portal y
        // que nos encontramos al otro lado del portal.
        if (wall.walk !== -1) {

          if (distance > -1) {
            // Obtenemos el nuevo sector.
            const nextSector = currentLevel.sectors[wall.walk]

            // Y ajustamos la altura.
            if (nextSector.floor.altitude <= position[1] + KYLE_HEIGHT) {
              nextPosition[1] = nextSector.floor.altitude - KYLE_HEIGHT
            }

            // Actualizamos el sector.
            currentSector = nextSector
            break
          }

        } else {

          // Esta pared no se puede atravesar, así que
          // comprobamos a qué distancia se encuentra
          // y "empujamos" al jugador hacia fuera.
          if (distance > -1 && distance < 1) {

            nextPosition[0] += wall.normal[0] * -distance * 0.5
            nextPosition[2] += wall.normal[1] * -distance * 0.5

          }
        }
      }

      currentLayer = currentSector.layer

      vec3.copy(position, nextPosition)

      previousTime = time

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

  /**
   * Gets all the visible sectors based on what the player
   * is seeing.
   * @param {number} time
   */
  function visibility(time) {
    // Clears all visible sectors and walls.
    // TODO: We can keep this if we have another step removing non visibles sectors.
    visibleSectors.clear()
    visibleWalls.clear()
    if (currentSector) {
      sectorsToVisit.push(currentSector)
      visibleSectors.add(currentSector)
    }
    while (sectorsToVisit.length > 0) {
      const sector = sectorsToVisit.shift()
      for (const wall of sector.walls) {
        const left = sector.vertices[wall.left]
        const right = sector.vertices[wall.right]

        const rsx = left[0] - position[0]
        const rsy = left[1] - position[2]

        const rex = right[0] - position[0]
        const rey = right[1] - position[2]

        const leftDot = direction[0] * rsx + direction[1] * rsy
        const rightDot = direction[0] * rex + direction[1] * rey

        const isMirror = wall.mirror !== -1
        const isMirrorVisible = isMirror
          ? visibleWalls.has(currentLevel.sectors[wall.adjoin].walls[wall.mirror])
          : false

        const isVisible = (leftDot < 0
                     || rightDot < 0)
                     && !isMirrorVisible

        if (!isVisible) {
          continue
        }

        visibleWalls.add(wall)
        if (wall.adjoin !== -1) {
          const sectorToVisit = currentLevel.sectors[wall.adjoin]
          if (!visibleSectors.has(sectorToVisit) && visibleSectors.size < MAX_VISIBLE_SECTORS) {
            visibleSectors.add(sectorToVisit)
            sectorsToVisit.push(sectorToVisit)
          }
        }
      }
    }
  }

  let isDirty = false
  let isGameMode = true
  let isRenderEnabled = true
  let isRenderBoundingRectsEnabled = true
  let isRenderWallIndexEnabled = true
  let isRenderOnlyCurrentLayer = true
  let isRenderOnlyCurrentSector = true
  let isRenderOnlyVisibleSectors = true
  let isDebugEnabled = true

  function renderSector(sector) {
    // If there's floor texture, then we should render floor plane.
    if (currentLevel.textures[sector.floor.texture.index]) {

      //
      // CONCAVE POLYGON RENDERING
      //
      // gl.useProgram(stencilProgram)

      // prepare stencil buffer
      gl.enable(gl.STENCIL_TEST)
      gl.clear(gl.STENCIL_BUFFER_BIT)

      // set stencil buffer to invert value on draw, 0 to 1 and 1 to 0
      gl.stencilFunc(gl.ALWAYS, 0, 1)
      gl.stencilOp(gl.INVERT, gl.INVERT, gl.INVERT)

      // disable writing to color buffer
      gl.colorMask(false, false, false, false)
      gl.depthMask(false)

      gl.uniform2f(
        defaultProgramUniforms.u_texbase,
        currentLevel.textures[sector.floor.texture.index].width / TEXTURE_BASE,
        currentLevel.textures[sector.floor.texture.index].height / TEXTURE_BASE
      )

      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, currentLevel.textures[sector.floor.texture.index].texture)
      gl.uniform1i(defaultProgramUniforms.u_sampler, 0)
      gl.uniform1f(defaultProgramUniforms.u_light, sector.light)

      gl.bindBuffer(gl.ARRAY_BUFFER, sector.floor.vertexBuffer)

      gl.enableVertexAttribArray(defaultProgramAttributes.a_coords)
      gl.vertexAttribPointer(defaultProgramAttributes.a_coords, 3, gl.FLOAT, gl.FALSE, 5 * 4, 0)

      gl.enableVertexAttribArray(defaultProgramAttributes.a_texcoords)
      gl.vertexAttribPointer(defaultProgramAttributes.a_texcoords, 2, gl.FLOAT, gl.FALSE, 5 * 4, 3 * 4)

      // gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sector.indexBuffer)

      gl.drawArrays(gl.TRIANGLE_FAN, 0, sector.floor.geometry.length / 5)

      // set stencil buffer to only keep pixels when value in buffer is 1
      gl.stencilFunc(gl.EQUAL, 1, 1)
      gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP)

      // enable color again
      gl.colorMask(true, true, true, true)
      gl.depthMask(true)

      //
      // CONCAVE POLYGON RENDERING END
      //

      // gl.useProgram(defaultProgram)

      gl.uniform2f(
        defaultProgramUniforms.u_texbase,
        currentLevel.textures[sector.floor.texture.index].width / TEXTURE_BASE,
        currentLevel.textures[sector.floor.texture.index].height / TEXTURE_BASE
      )

      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, currentLevel.textures[sector.floor.texture.index].texture)
      gl.uniform1i(defaultProgramUniforms.u_sampler, 0)
      gl.uniform1f(defaultProgramUniforms.u_light, sector.light)

      gl.bindBuffer(gl.ARRAY_BUFFER, sector.floor.vertexBuffer)

      gl.enableVertexAttribArray(defaultProgramAttributes.a_coords)
      gl.vertexAttribPointer(defaultProgramAttributes.a_coords, 3, gl.FLOAT, gl.FALSE, 5 * 4, 0)

      gl.enableVertexAttribArray(defaultProgramAttributes.a_texcoords)
      gl.vertexAttribPointer(defaultProgramAttributes.a_texcoords, 2, gl.FLOAT, gl.FALSE, 5 * 4, 3 * 4)

      // gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sector.indexBuffer)

      gl.drawArrays(gl.TRIANGLE_FAN, 0, sector.floor.geometry.length / 5)

      gl.disable(gl.STENCIL_TEST)
      // gl.drawElements(gl.TRIANGLES, sector.indices.length, gl.UNSIGNED_SHORT, 0)
    }

    // If there's ceiling texture then we should rendering this sector.
    if (currentLevel.textures[sector.ceiling.texture.index]
      && !(sector.flags[0] & 0x01 === 0x01)) {

      // prepare stencil buffer
      gl.enable(gl.STENCIL_TEST)
      gl.clear(gl.STENCIL_BUFFER_BIT)

      // set stencil buffer to invert value on draw, 0 to 1 and 1 to 0
      gl.stencilFunc(gl.ALWAYS, 0, 1)
      gl.stencilOp(gl.INVERT, gl.INVERT, gl.INVERT)

      // disable writing to color buffer
      gl.colorMask(false, false, false, false)
      gl.depthMask(false)

      gl.uniform2f(
        defaultProgramUniforms.u_texbase,
        currentLevel.textures[sector.ceiling.texture.index].width / TEXTURE_BASE,
        currentLevel.textures[sector.ceiling.texture.index].height / TEXTURE_BASE
      )

      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, currentLevel.textures[sector.ceiling.texture.index].texture)
      gl.uniform1i(defaultProgramUniforms.u_sampler, 0)
      gl.uniform1f(defaultProgramUniforms.u_light, sector.light)

      gl.bindBuffer(gl.ARRAY_BUFFER, sector.ceiling.vertexBuffer)

      gl.enableVertexAttribArray(defaultProgramAttributes.a_coords)
      gl.vertexAttribPointer(defaultProgramAttributes.a_coords, 3, gl.FLOAT, gl.FALSE, 5 * 4, 0)

      gl.enableVertexAttribArray(defaultProgramAttributes.a_texcoords)
      gl.vertexAttribPointer(defaultProgramAttributes.a_texcoords, 2, gl.FLOAT, gl.FALSE, 5 * 4, 3 * 4)

      gl.drawArrays(gl.TRIANGLE_FAN, 0, sector.ceiling.geometry.length / 5)

      // set stencil buffer to only keep pixels when value in buffer is 1
      gl.stencilFunc(gl.EQUAL, 1, 1)
      gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP)

      // enable color again
      gl.colorMask(true, true, true, true)
      gl.depthMask(true)

      gl.uniform2f(
        defaultProgramUniforms.u_texbase,
        currentLevel.textures[sector.ceiling.texture.index].width / TEXTURE_BASE,
        currentLevel.textures[sector.ceiling.texture.index].height / TEXTURE_BASE
      )

      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, currentLevel.textures[sector.ceiling.texture.index].texture)
      gl.uniform1i(defaultProgramUniforms.u_sampler, 0)
      gl.uniform1f(defaultProgramUniforms.u_light, sector.light)

      gl.bindBuffer(gl.ARRAY_BUFFER, sector.ceiling.vertexBuffer)

      gl.enableVertexAttribArray(defaultProgramAttributes.a_coords)
      gl.vertexAttribPointer(defaultProgramAttributes.a_coords, 3, gl.FLOAT, gl.FALSE, 5 * 4, 0)

      gl.enableVertexAttribArray(defaultProgramAttributes.a_texcoords)
      gl.vertexAttribPointer(defaultProgramAttributes.a_texcoords, 2, gl.FLOAT, gl.FALSE, 5 * 4, 3 * 4)

      gl.drawArrays(gl.TRIANGLE_FAN, 0, sector.ceiling.geometry.length / 5)
      // gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sector.indexBuffer)

      gl.disable(gl.STENCIL_TEST)
      // gl.drawElements(gl.TRIANGLES, sector.indices.length, gl.UNSIGNED_SHORT, 0)
    }

    // Renderiza las paredes del sector.
    renderWalls(sector)
  }

  /**
   * Renderiza los sectores
   */
  function renderSectors() {

    gl.enable(gl.DEPTH_TEST)
    gl.useProgram(defaultProgram)
    gl.uniform4f(defaultProgramUniforms.u_fogColor, ...fogColor)
    gl.uniformMatrix4fv(defaultProgramUniforms.u_mvp, false, projectionView)

    for (const sector of visibleSectors) {
      renderSector(sector)
    }
  }

  /**
   * Renders a wall
   * @param {Wall} wall
   */
  function renderWall(wall) {
    if (wall.mid.vertexBuffer) {

      if (currentLevel.textures[wall.mid.texture]) {
        gl.uniform2f(
          defaultProgramUniforms.u_texbase,
          currentLevel.textures[wall.mid.texture].width / TEXTURE_BASE,
          currentLevel.textures[wall.mid.texture].height / TEXTURE_BASE
        )

        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, currentLevel.textures[wall.mid.texture].texture)
        gl.uniform1i(defaultProgramUniforms.u_sampler, 0)
        gl.uniform1f(defaultProgramUniforms.u_light, wall.light)

        gl.bindBuffer(gl.ARRAY_BUFFER, wall.mid.vertexBuffer)

        gl.enableVertexAttribArray(defaultProgramAttributes.a_coords)
        gl.vertexAttribPointer(defaultProgramAttributes.a_coords, 3, gl.FLOAT, gl.FALSE, 5 * 4, 0)

        gl.enableVertexAttribArray(defaultProgramAttributes.a_texcoords)
        gl.vertexAttribPointer(defaultProgramAttributes.a_texcoords, 2, gl.FLOAT, gl.FALSE, 5 * 4, 3 * 4)

        gl.drawArrays(gl.TRIANGLE_FAN, 0, 4)
      }

    } else {

      if (currentLevel.textures[wall.top.texture]) {

        gl.uniform2f(
          defaultProgramUniforms.u_texbase,
          currentLevel.textures[wall.top.texture].width / TEXTURE_BASE,
          currentLevel.textures[wall.top.texture].height / TEXTURE_BASE
        )

        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, currentLevel.textures[wall.top.texture].texture)
        gl.uniform1i(defaultProgramUniforms.u_sampler, 0)
        gl.uniform1f(defaultProgramUniforms.u_light, wall.light)

        gl.bindBuffer(gl.ARRAY_BUFFER, wall.top.vertexBuffer)

        gl.enableVertexAttribArray(defaultProgramAttributes.a_coords)
        gl.vertexAttribPointer(defaultProgramAttributes.a_coords, 3, gl.FLOAT, gl.FALSE, 5 * 4, 0)

        gl.enableVertexAttribArray(defaultProgramAttributes.a_texcoords)
        gl.vertexAttribPointer(defaultProgramAttributes.a_texcoords, 2, gl.FLOAT, gl.FALSE, 5 * 4, 3 * 4)

        gl.drawArrays(gl.TRIANGLE_FAN, 0, 4)
      }

      if (currentLevel.textures[wall.bottom.texture]) {

        gl.uniform2f(
          defaultProgramUniforms.u_texbase,
          currentLevel.textures[wall.bottom.texture].width / TEXTURE_BASE,
          currentLevel.textures[wall.bottom.texture].height / TEXTURE_BASE
        )

        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, currentLevel.textures[wall.bottom.texture].texture)
        gl.uniform1i(defaultProgramUniforms.u_sampler, 0)
        gl.uniform1f(defaultProgramUniforms.u_light, wall.light)

        gl.bindBuffer(gl.ARRAY_BUFFER, wall.bottom.vertexBuffer)

        gl.enableVertexAttribArray(defaultProgramAttributes.a_coords)
        gl.vertexAttribPointer(defaultProgramAttributes.a_coords, 3, gl.FLOAT, gl.FALSE, 5 * 4, 0)

        gl.enableVertexAttribArray(defaultProgramAttributes.a_texcoords)
        gl.vertexAttribPointer(defaultProgramAttributes.a_texcoords, 2, gl.FLOAT, gl.FALSE, 5 * 4, 3 * 4)

        gl.drawArrays(gl.TRIANGLE_FAN, 0, 4)
      }

    }
  }

  /**
   * Renders sector walls
   * @param {Sector} sector
   */
  function renderWalls(sector) {
    for (const wall of sector.walls) {
      // TODO: Change this to something like wall.isVisible
      // and make a better calculation for what sector is
      // actually rendered (not only checking dot product).
      if (visibleWalls.has(wall)) {
        renderWall(wall)
      }
    }
  }

  /**
   * Renders a frame object
   * @param {LevelObject} object
   */
  function renderFrame(object) {
    const { x, y, z } = object

    const spritePosition = vec3.create()
    const spriteProjectionView = mat4.create()
    const spriteModel = mat4.create()

    gl.useProgram(spriteProgram)

    vec3.set(spritePosition, -x, y, z)

    mat4.identity(spriteModel)
    mat4.translate(spriteModel, spriteModel, spritePosition)
    mat4.multiply(spriteModel, spriteModel, rotation)
    mat4.multiply(spriteProjectionView, projectionView, spriteModel)

    gl.uniformMatrix4fv(spriteProgramUniforms.u_mvp, false, spriteProjectionView)

    let frame
    if (object.logics.includes('BATTERY')) {
      frame = currentLevel.frames.get('IBATTERY.FME')
    } else if (object.logics.includes('SUPERCHARGE')) {
      frame = currentLevel.frames.get('ICHARGE.FME')
    } else if (object.logics.includes('MEDKIT')) {
      frame = currentLevel.frames.get('IMEDKIT.FME')
    } else if (object.logics.includes('GOGGLES')) {
      frame = currentLevel.frames.get('IGOGGLES.FME')
    } else if (object.logics.includes('RIFLE')) {
      frame = currentLevel.frames.get('IGOGGLES.FME')
    } else if (object.logics.includes('ITEM ENERGY')) {
      frame = currentLevel.frames.get('IGOGGLES.FME')
    }

    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, frame.texture)
    gl.uniform2f(spriteProgramUniforms.u_size, frame.width, frame.height)

    gl.bindBuffer(gl.ARRAY_BUFFER, spriteBuffer)

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null)

    gl.enableVertexAttribArray(spriteProgramAttributes.a_coords)
    gl.vertexAttribPointer(spriteProgramAttributes.a_coords, 3, gl.FLOAT, gl.FALSE, 5 * 4, 0)

    gl.enableVertexAttribArray(spriteProgramAttributes.a_texcoords)
    gl.vertexAttribPointer(spriteProgramAttributes.a_texcoords, 2, gl.FLOAT, gl.FALSE, 5 * 4, 3 * 4)

    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4)

    gl.disable(gl.BLEND)
  }

  /**
   * Renders a sprite object
   * @param {LevelObject} object
   */
  function renderSprite(object) {
    const { position: [x, y, z] } = object

    const spritePosition = vec3.create()
    const spriteProjectionView = mat4.create()
    const spriteModel = mat4.create()

    gl.useProgram(spriteProgram)

    vec3.set(spritePosition, -x, y, z)

    mat4.identity(spriteModel)
    mat4.translate(spriteModel, spriteModel, spritePosition)
    mat4.multiply(spriteModel, spriteModel, rotation)
    mat4.multiply(spriteProjectionView, projectionView, spriteModel)

    gl.uniformMatrix4fv(spriteProgramUniforms.u_mvp, false, spriteProjectionView)

    const sprite = currentLevel.sprites[object.data]
    const angles = sprite.states[0].angles.length

    const dx = Math.cos(-viewAngles[1] + Math.PI * 0.5)
    const dy = Math.sin(-viewAngles[1] + Math.PI * 0.5)

    const rx = x - position[0]
    const ry = z - position[2]

    const dot = dx * rx + dy * ry

    const { fme } = sprite.states[0].angles[0].frames[Math.floor(object.currentFrame)]
    object.currentFrame = (object.currentFrame + (sprite.states[0].frameRate / 60)) % sprite.states[0].angles[0].frames.length

    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, fme.texture)
    gl.uniform2f(spriteProgramUniforms.u_size, fme.width, fme.height)

    gl.bindBuffer(gl.ARRAY_BUFFER, spriteBuffer)

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null)

    gl.enableVertexAttribArray(spriteProgramAttributes.a_coords)
    gl.vertexAttribPointer(spriteProgramAttributes.a_coords, 3, gl.FLOAT, gl.FALSE, 5 * 4, 0)

    gl.enableVertexAttribArray(spriteProgramAttributes.a_texcoords)
    gl.vertexAttribPointer(spriteProgramAttributes.a_texcoords, 2, gl.FLOAT, gl.FALSE, 5 * 4, 3 * 4)

    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4)

    gl.disable(gl.BLEND)
  }

  /**
   * Renders a 3d object
   * @param {LevelObject} object
   */
  function renderMesh(object) {
    const { position: [x, y, z] } = object

    const meshPosition = vec3.create()
    const meshProjectionView = mat4.create()
    const meshModel = mat4.create()

    gl.useProgram(meshProgram)

    vec3.set(meshPosition, -x, y, z)

    mat4.identity(meshModel)
    mat4.translate(meshModel, meshModel, meshPosition)
    mat4.multiply(meshProjectionView, projectionView, meshModel)

    gl.uniformMatrix4fv(meshProgramUniforms.u_mvp, false, meshProjectionView)

    const mesh = currentLevel.meshes[object.data]
    for (const object of mesh.objects) {
      gl.bindBuffer(gl.ARRAY_BUFFER, object.vertexBuffer)
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, object.indexBuffer)

      gl.enableVertexAttribArray(meshProgramAttributes.a_coords)
      gl.vertexAttribPointer(meshProgramAttributes.a_coords, 3, gl.FLOAT, gl.FALSE, 3 * 4, 0)

      gl.drawElements(gl.TRIANGLES, object.indices.length, gl.UNSIGNED_SHORT, 0)
    }
  }


  /**
   * Renders objects
   */
  function renderObjects() {
    // TODO: We should draw all the sprites in here, we also need to reorder
    // all the objects to do the alpha blending.
    for (const object of currentLevel.objects) {
      switch (object.className) {
      case 'frame': renderFrame(object); break
      case 'sprite': renderSprite(object); break
      case '3d': renderMesh(object); break
      }
    }
  }

  /**
   * Renders everything.
   */
  function render() {
    if (gl.canvas.width !== gl.canvas.clientWidth * window.devicePixelRatio) {
      gl.canvas.width = gl.canvas.clientWidth * window.devicePixelRatio
      isDirty = true
    }

    if (gl.canvas.height !== gl.canvas.clientHeight * window.devicePixelRatio) {
      gl.canvas.height = gl.canvas.clientHeight * window.devicePixelRatio
      isDirty = true
    }

    if (isDirty) {
      mat4.perspective(projection, Math.PI * 0.25, gl.canvas.width / gl.canvas.height, 0.1, 1000.0)
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
      isDirty = false
    }

    // Sets the rotation matrix
    mat4.identity(rotation)
    mat4.rotateY(rotation, rotation, viewAngles[1])
    mat4.rotateX(rotation, rotation, viewAngles[0])

    // Sets the model matrix.
    mat4.identity(model)
    mat4.translate(model, model, position)
    mat4.multiply(model, model, rotation)
    mat4.invert(view, model)
    mat4.multiply(projectionView, projection, view)

    // clear colors.
    gl.clearColor(0, 0, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.STENCIL_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

    /*
    gl.enable(gl.CULL_FACE)
    gl.cullFace(gl.BACK_FACE)
    */

    renderSectors()
    renderObjects()

  }

  function renderDebugPlayer() {

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

    if (!isDebugEnabled) {
      return
    }

    log.render(cx)

    const scx = cx.canvas.width >> 1
    const scy = cx.canvas.height >> 1

    cx.save()
    cx.translate(scx, scy)
    cx.rotate(-viewAngles[1] + Math.PI * 0.5)
    cx.beginPath()
    cx.moveTo(8, 0)
    cx.lineTo(-8, 0)
    cx.lineTo(0, 4)
    cx.lineTo(0, -4)
    cx.lineTo(-8, 0)
    cx.closePath()
    cx.fillStyle = '#f0f'
    cx.strokeStyle = '#f0f'
    cx.stroke()
    cx.fill()
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
            cx.strokeStyle = '#070'
          } else {
            cx.strokeStyle = '#0f0'
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
          cx.fillStyle = '#0ff'
          cx.fillText(`${wall.index} ${wall.distance && wall.distance.toFixed(2)} ${visibleWalls.has(wall)}`, tx * zoom, ty * zoom)
          //cx.fillText(`${wall.index} ${wall.leftDot.toFixed(2)} ${wall.rightDot.toFixed(2)}`, tx * zoom, ty * zoom)
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
    cx.fillText(`${viewAngles.join(', ')}`, 0, textY += 16)
    cx.fillText(`${position.join(', ')}`, 0, textY += 16)
    if (currentSectors.size > 0) {
      for (const currentSector of currentSectors) {
        cx.fillText(`Sector ${currentSector.index} ${currentSector.name} ${currentSector.layer}`, 0, textY += 16)
        cx.fillText(`- Flags: ${currentSector.flags.join(', ')}`, 0, textY += 16)
        cx.fillText(`- Light: ${currentSector.light}`, 0, textY += 16)
        cx.fillText(`- Floor: ${currentSector.floor.altitude} ${currentSector.floor.texture.index} ${currentSector.floor.texture.x} ${currentSector.floor.texture.y} ${currentSector.floor.texture.flags.toString(2)}`, 0, textY += 16)
        cx.fillText(`- Ceiling: ${currentSector.ceiling.altitude} ${currentSector.ceiling.texture.index} ${currentSector.ceiling.texture.x} ${currentSector.ceiling.texture.y} ${currentSector.ceiling.texture.flags.toString(2)}`, 0, textY += 16)
        cx.fillText(`- Rect: ${currentSector.boundingRect.join(', ')}`, 0, textY += 16)
        cx.fillText(`- Box: ${currentSector.boundingBox.join(', ')}`, 0, textY += 16)
      }
    }

    // FIX: There are some FMEs that aren't rendered.
    // cx.putImageData(currentLevel.frames.get('ICHARGE.FME').imageData, 0, 0)
    // cx.putImageData(currentLevel.sprites[0].states[0].angles[0].frames[0].fme.imageData, 0, 0)
  }

  // Frame identifier.
  let frameID

  /**
   * Every frame this is called
   * @param {number} time
   */
  function frame(time) {
    input(time)
    update(time)
    visibility(time)
    render(time)
    renderDebug(time)
    frameID = window.requestAnimationFrame(frame)
  }

  function stop() {
    mouse.stop()
    touchpad.stop()
    keyboard.stop()
    gamepad.stop()
    window.cancelAnimationFrame(frameID)
    frameID = undefined
  }

  function start() {
    mouse.start()
    touchpad.start()
    keyboard.start()
    keyboard.on('Digit1', () => isDebugEnabled = !isDebugEnabled)
    keyboard.on('BracketLeft', () => {
      if (zoom > MIN_ZOOM) zoom--
    })
    keyboard.on('BracketRight', () => {
      if (zoom < MAX_ZOOM) zoom++
    })
    keyboard.on('KeyZ', () => {
      if (currentLayer > MIN_LAYER) currentLayer--
    })
    keyboard.on('KeyX', () => {
      if (currentLayer < MAX_LAYER) currentLayer++
    })
    /*
    keyboard.on('KeyY', () => {
      if (isRecording) {
        mediaRecorder.stop()
      } else {
        mediaRecorder.start()
      }
    })
    */

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
