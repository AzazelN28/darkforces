import earcut from 'earcut'
import { buildMidWall, buildAdjoinedBottomWall, buildAdjoinedTopWall, buildCeiling, buildFloor } from './build'
import { from, isBetween } from '../utils/range'

/**
 * Triangulates a sector using the `earcut` algorithm.
 * @param {Sector} sector
 * @returns {Array<number>}
 */
function triangulate(sector) {
  return earcut(sector.vertices.flat())
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
}

/**
 * Computes the bounding box of a sector
 * @param {Sector} sector
 * @returns {BoundingBox}
 */
function computeSectorBoundingBox(sector) {
  let maxX = Number.MIN_VALUE
  let minX = Number.MAX_VALUE
  let maxZ = Number.MIN_VALUE
  let minZ = Number.MAX_VALUE
  const minY = sector.ceiling.altitude
  const maxY = sector.floor.altitude
  for (const wall of sector.walls) {
    const [x, y] = sector.vertices[wall.left]
    maxX = Math.max(maxX, x)
    minX = Math.min(minX, x)
    maxZ = Math.max(maxZ, y)
    minZ = Math.min(minZ, y)
  }
  return [
    minX, maxX,
    minY, maxY,
    minZ, maxZ
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
 * @param {number} light - Sector/Wall light
 * @returns {number} A value between 0.5 and 1.0 that represents how much light the sector or wall has
 */
function getLight(light) {
  if (light > 31) {
    return 1.0
  }
  return from(light, -32, 31)
}

/**
 * Returns the current sector
 * @param {vec3} position
 * @param {Array<Sector>} sectors
 * @returns {Sector|null}
 */
export function getCurrentSector([x, y, z], sectors) {
  // TODO: This should give better results by using walls instead
  // of just using bounding boxes.
  for (const sector of sectors) {
    const [minX, maxX, minY, maxY, minZ, maxZ] = sector.boundingBox
    if (isBetween(x, minX, maxX)
     && isBetween(y, minY, maxY)
     && isBetween(z, minZ, maxZ)) {
      return sector
    }
  }
  return null
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
  const sectors = basic.sectors.map((sector) => {
    const indices = triangulate(sector)
    const walls = sector.walls.map((wall) => {
      // If the wall it's not connected to another sector
      // then we should build a complete wall.
      let midGeometry, topGeometry, bottomGeometry
      if (wall.adjoin < 0) {
        midGeometry = buildMidWall(sector, wall)
      // Otherwise we build the top part of the wall and
      // the bottom part of the wall.
      } else {
        topGeometry = buildAdjoinedTopWall(sector, basic.sectors[wall.adjoin], wall)
        bottomGeometry = buildAdjoinedBottomWall(sector, basic.sectors[wall.adjoin], wall)
      }
      return {
        ...wall,
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
    return {
      ...sector,
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
      boundingBox: computeSectorBoundingBox(sector),
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
  console.log(...styles)
  console.log(`Loading color maps ${upperCaseName}.CMP`)
  const colorMaps = await fm.fetch(`${upperCaseName}.CMP`)
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
    return fm.fetch(current)
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
  const frames = await Promise.all(objects.frames.map((current) => {
    console.log(`Loading frame ${current}`)
    return fm.fetch(current)
  }))
  console.log(`Loading sprites ${objects.spriteCount}`)
  const sprites = await Promise.all(objects.sprites.map((current) => {
    console.log(`Loading sprite ${current}`)
    return fm.fetch(current)
  }))
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
