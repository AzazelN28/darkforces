import earcut from 'earcut'
import { vec2 } from 'gl-matrix'
import { buildMidWall, buildAdjoinedBottomWall, buildAdjoinedTopWall, buildCeiling, buildFloor } from './build'
import { from, isWithin } from '../utils/range'

/**
 * Triangulates a sector using the `earcut` algorithm.
 * @param {Sector} sector
 * @returns {Array<number>}
 */
function triangulate(sector) {
  return sector.vertices.map((index) => index).reverse()
  // return earcut(sector.vertices.flat())
  /*
  const vertices = []
  const holes = []
  let start = null
  for (const wall of sector.walls) {
    const [x, y] = sector.vertices[wall.left]
    // const [ex, ey] = sector.vertices[wall.right]
    vertices.push(x, y)
    if (start === null) {
      start = wall.left
    } else if (start === wall.right) {
      holes.push(start)
      start = null
    }
  }
  if (holes.length > 1) {
    for (let index = holes.length - 1; index >= 0; index--) {
      if (holes[index] === 0) {
        holes.splice(index, 1)
      }
    }
  } else {
    holes.pop()
  }
  return earcut(vertices, holes)
  */
}

/**
 * Computes the bounding rect of a sector.
 * @param {Sector} sector
 * @returns {BoundingRect}
 */
function computeSectorBoundingRect(sector) {
  let maxX, minX, maxZ, minZ
  for (const wall of sector.walls) {
    const [sx, sz] = sector.vertices[wall.left]
    const [ex, ez] = sector.vertices[wall.right]
    maxX = (maxX === undefined)
      ? Math.max(sx, ex)
      : Math.max(maxX, sx, ex)
    minX = (minX === undefined)
      ? Math.min(sx, ex)
      : Math.min(minX, sx, ex)
    maxZ = (maxZ === undefined)
      ? Math.max(sz, ez)
      : Math.max(maxZ, sz, ez)
    minZ = (minZ === undefined)
      ? Math.min(sz, ez)
      : Math.min(minZ, sz, ez)
  }
  return [
    minX, maxX,
    minZ, maxZ,
    maxX - minX, // ancho
    maxZ - minZ // alto
  ]
}

/**
 * Computes the bounding box of a sector.
 * @param {Sector} sector
 * @returns {BoundingBox}
 */
function computeSectorBoundingBox(sector) {
  const minY = sector.ceiling.altitude
  const maxY = sector.floor.altitude
  const [minX, maxX, minZ, maxZ] = computeSectorBoundingRect(sector)
  return [
    minX, maxX,
    minY, maxY,
    minZ, maxZ,
    maxX - minX, // ancho
    maxY - minY, // alto
    maxZ - minZ  // largo
  ]
}

/**
 * Returns the fog color extracted from the color map palette.
 * @param {Palette} palette
 * @param {Array<ColorMap>} colorMaps
 * @return {Color}
 */
function getFogColor(palette, colorMaps) {
  // The first 32 colors of the palette are always the same.
  const FOG_COLOR_INDEX = 33
  const start = colorMaps[0][FOG_COLOR_INDEX] * 4
  const end = (colorMaps[0][FOG_COLOR_INDEX] + 1) * 4
  return palette.slice(start, end)
}

/**
 * Returns the real light value.
 * @param {number} light Sector/Wall light
 * @returns {number} A value between 0.5 and 1.0 that represents how much light the sector or wall has
 */
function getLight(light) {
  if (light > 31) {
    return 1.0
  }
  return from(light, -32, 31)
}

/**
 * Returns if the specified point is contained in the
 * BoundingRect
 * @param {vec3} position
 * @param {BoundingRect} boundingRect
 * @returns {boolean}
 */
export function isInBoundingRect([x, , z], boundingRect) {
  const [minX, maxX, minZ, maxZ] = boundingRect
  return isWithin(x, minX, maxX)
      && isWithin(z, minZ, maxZ)
}

/**
 * Returns if the specified point is containd in the
 * BoundingBox.
 * @param {vec3} position
 * @param {BoundingBox} boundingBox
 * @returns {boolean}
 */
export function isInBoundingBox([x, y, z], boundingBox) {
  const [minX, maxX, minY, maxY, minZ, maxZ] = boundingBox
  return isWithin(x, minX, maxX)
      && isWithin(y, minY, maxY)
      && isWithin(z, minZ, maxZ)
}

/**
 * Returns the side of the wall where the point lies
 * @param {vec3} position
 * @param {Sector} sector
 * @param {Wall} wall
 * @returns {number}
 */
export function sideOfWall([x, , z], sector, wall) {
  const [sx, sz] = sector.vertices[wall.left]
  const [ex, ez] = sector.vertices[wall.right]
  const dx = ex - sx
  const dz = ez - sz
  return Math.sign(dx * (z - sz) - dz * (x - sx))
}

/**
 * Returns the absolute distance to wall
 * @param {vec3} position
 * @param {Sector} sector
 * @param {Wall} wall
 * @returns {number}
 */
export function distanceToWall([x, , z], sector, wall) {
  const [sx, sz] = sector.vertices[wall.left]
  const [ex, ez] = sector.vertices[wall.right]
  const dx = ex - sx
  const dz = ez - sz
  return Math.abs(dz * x - dx * z + ex * sz - ez * sx) / Math.sqrt(dz * dz + dx * dx)
}

/**
 * Returns the signed distance to wall
 * @param {vec3} position
 * @param {Sector} sector
 * @param {Wall} wall
 * @returns {number}
 */
export function signedDistanceToWall([x, , z], sector, wall) {
  const [sx, sz] = sector.vertices[wall.left]
  const [ex, ez] = sector.vertices[wall.right]
  const dx = ex - sx
  const dz = ez - sz
  return (dz * x - dx * z + ex * sz - ez * sx) / Math.sqrt(dz * dz + dx * dx)
}

/**
 * Returns if the position lies on the wall
 * @param {vec3} position
 * @param {Sector} sector
 * @param {Wall} wall
 * @returns {boolean}
 */
export function isPositionOnWall([x, , z], sector, wall) {
  const [sx, sz] = sector.vertices[wall.left]
  const [ex, ez] = sector.vertices[wall.right]
  const dx = ex - sx
  const dz = ez - sz
  const px = x - sx
  const pz = z - sz
  const max = dx * dx + dz * dz
  const value = dx * px + dz * pz
  return value > 0 && value < max
}

/**
 * Returns if point is projected on line segment
 * @param {vec2} position
 * @param {vec2} start
 * @param {vec2} end
 * @returns {boolean}
 */
export function isProjectedPointOnSegment([x, y], [sx, sy], [ex, ey]) {
  const [t1x, t1y] = [ex - sx, ey - sy]
  const [t2x, t2y] = [x - sx, y - sy]
  const max = t1x * t1x + t1y * t1y
  const value = t1x * t2x + t1y * t2y
  return (value > 0 && value < max)
}

/**
 * Returns candidates to be the current sector.
 * @param {vec3} position Entity position.
 * @param {Array<Sector>} sectors Level sectors.
 * @returns {Array<Sector>} Sectors that could contain the player.
 */
export function getCurrentSectors(position, sectors) {
  const candidates = []
  for (const sector of sectors) {
    if (isInBoundingBox(position, sector.boundingBox)) {
      candidates.push(sector)
    }
  }
  return candidates
}

/**
 * Returns the current sector
 * @param {vec3} position
 * @param {Array<Sector>} sectors
 * @returns {Sector|null}
 */
export function getFirstSector(position, sectors) {
  for (const sector of sectors) {
    if (isInBoundingBox(position, sector.boundingBox)) {
      return sector
    }
  }
  return null
}

/**
 * Returns the current sector
 * @param {vec3} position
 * @param {Array<Sector>} sectors
 * @returns {Sector|null}
 */
export function getCurrentSector(position, sectors) {
  const candidates = getCurrentSectors(position, sectors)
  if (candidates.length === 0) {
    return null
  }
  candidates.sort((a, b) => b.boundingArea - a.boundingArea)
  return candidates.pop()
}

/**
 * Loads a level
 * @param {FileManager} fm - File manager
 * @param {string} name - Level name
 * @returns {Promise<Level|Error>}
 */
export async function load(fm, name) {
  const upperCaseName = name.toUpperCase()
  console.log(`Loading ${upperCaseName}.LEV`)
  const basic = await fm.fetch(`${upperCaseName}.LEV`)
  console.log(basic)
  const sectors = basic.sectors.map((sector, index) => {
    const indices = triangulate(sector)
    const walls = sector.walls.map((wall, index) => {
      const start = sector.vertices[wall.left]
      const end = sector.vertices[wall.right]
      const dx = end[0] - start[0]
      const dy = end[1] - start[1]
      const size = vec2.fromValues(dx, dy)
      const tangent = vec2.fromValues(dx, dy)
      vec2.normalize(tangent, tangent)
      const normal = vec2.fromValues(-dy, dx)
      vec2.normalize(normal, normal)
      // If the wall it's not connected to another sector
      // then we should build a complete wall.
      let midGeometry, topGeometry, bottomGeometry
      if (wall.adjoin < 0) {
        midGeometry = buildMidWall(sector, wall)
        // Otherwise we build the top part of the wall and
        // the bottom part of the wall.
      } else {
        if (wall.mirror < 0) {
          topGeometry = buildAdjoinedTopWall(sector, basic.sectors[wall.adjoin], wall)
          bottomGeometry = buildAdjoinedBottomWall(sector, basic.sectors[wall.adjoin], wall)
        } else {
          topGeometry = buildAdjoinedTopWall(sector, basic.sectors[wall.adjoin], wall)
          bottomGeometry = buildAdjoinedBottomWall(sector, basic.sectors[wall.adjoin], wall)
        }
      }
      return {
        ...wall,
        index,
        distance: null,
        size,
        tangent,
        normal,
        mid: {
          ...wall.mid,
          geometry: midGeometry,
          buffer: null
        },
        top: {
          ...wall.top,
          geometry: topGeometry,
          buffer: null
        },
        bottom: {
          ...wall.bottom,
          geometry: bottomGeometry,
          buffer: null
        },
        light: getLight(wall.light),
        midGeometry,
        midBuffer: null,
        topGeometry,
        topBuffer: null,
        bottomGeometry,
        bottomBuffer: null
      }
    })
    const boundingBox = computeSectorBoundingBox(sector)
    const boundingRect = computeSectorBoundingRect(sector)
    const [, , , , width, height] = boundingRect
    const boundingArea = width * height
    if (sector.flags[0] !== 0 || sector.flags[1] !== 0 || sector.flags[2] !== 0) {
      console.log(index, sector.name, sector.flags.map((flag) => flag.toString(2).padStart(16,0)))
    }
    return {
      ...sector,
      index,
      indices,
      indexBuffer: null,
      floor: {
        ...sector.floor,
        geometry: buildFloor(sector),
        buffer: null
      },
      ceiling: {
        ...sector.ceiling,
        geometry: buildCeiling(sector),
        buffer: null
      },
      light: getLight(sector.light),
      walls,
      boundingBox,
      boundingRect,
      boundingArea,
      wallColor: new Float32Array([Math.random(), Math.random(), Math.random()]),
      planeColor: new Float32Array([Math.random(), Math.random(), Math.random()]),
    }
  })
  console.log(`Loading palette ${basic.palette}`)
  const palette = await fm.fetch(basic.palette)
  console.log(palette)
  let message = ''
  const styles = []
  for (let index = 0; index < palette.length; index+=4) {
    const r = palette[index]
    const g = palette[index + 1]
    const b = palette[index + 2]
    const a = palette[index + 3]
    const style = `background: rgba(${r},${g},${b},${a}); color: rgba(${r},${g},${b},${a})`
    message += '%c_'
    if (index % (32 * 4) === 0 && index !== 0) {
      message += '\n'
    }
    styles.push(style)
  }
  styles.unshift(message)
  /*console.log(...styles)
  console.log(`Loading color maps ${upperCaseName}.CMP`)*/
  const colorMaps = await fm.fetch(`${upperCaseName}.CMP`)
  /*
  console.log(colorMaps)
  for (const colorMap of colorMaps) {
    message = ''
    const styles = []
    for (let index = 0; index < colorMap.length; index++) {
      const r = palette[colorMap[index] * 4]
      const g = palette[colorMap[index] * 4 + 1]
      const b = palette[colorMap[index] * 4 + 2]
      const a = palette[colorMap[index] * 4 + 3]
      const style = `background: rgba(${r},${g},${b},${a}); color: rgba(${r},${g},${b},${a})`
      message += `%c${'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'.substr(~~(Math.random() * 27), 1)}`
      styles.push(style)
    }
    styles.unshift(message)
    console.log(...styles)
  }
  console.log(`Color maps loaded`)
  */
  /*
  console.log(`Loading music ${basic.music}`)
  if (!fm.fetch(basic.music)) {
    console.warn(`Cannot load ${basic.music}`)
  } else {
    const music = gmd.parseEntry(fm.fetch(basic.music))
  }
  */
  console.log(`Loading textures ${basic.textureCount}`)
  const textures = await Promise.all(basic.textures.map((current, index, list) => {
    console.log(`Loading texture ${current} (${index + 1}/${list.length})`)
    return fm.fetch(current).catch((error) => null)
  }))
  console.log(textures)
  console.log(`Loading ${upperCaseName}.O`)
  const objects = await fm.fetch(`${upperCaseName}.O`)
  console.log(objects)
  console.log(`Loading meshes ${objects.podCount}`)
  const meshes = await Promise.all(objects.pods.map((current) => {
    console.log(`Loading mesh ${current}`)
    return fm.fetch(current)
  }))
  console.log(meshes)
  console.log(`Loading frames ${objects.frameCount}`)
  const frames = new Map(await Promise.all(objects.frames.map((current) => {
    console.log(`Loading frame ${current}`)
    return fm.fetch(current)
      .then((frame) => [current, frame])
  })))
  console.log(frames)
  console.log(`Loading sprites ${objects.spriteCount}`)
  const sprites = await Promise.all(objects.sprites.map((current) => {
    console.log(`Loading sprite ${current}`)
    return fm.fetch(current)
  }))
  console.log(sprites)
  console.log(`Loading sounds ${objects.soundCount}`)
  const sounds = await Promise.all(objects.sounds.map((current) => {
    console.log(`Loading sound ${current}`)
    return fm.fetch(current)
  }))
  console.log(`Loading ${upperCaseName}.INF`)
  const info = await fm.fetch(`${upperCaseName}.INF`)
  console.log(info)
  console.log(`Loading ${upperCaseName}.GOL`)
  const goals = await fm.fetch(`${upperCaseName}.GOL`)
  console.log(goals)
  return {
    fogColor: getFogColor(palette, colorMaps),
    sectors,
    objects: objects.objects,
    palette,
    colorMaps,
    textures,
    meshes,
    frames,
    sprites,
    sounds,
    info,
    goals
  }
}

export default {
  load
}
