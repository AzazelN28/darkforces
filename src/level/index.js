import lev from 'files/lev'
import o from 'files/o'
import inf from 'files/inf'
import gol from 'files/gol'
import pal from 'files/pal'
import fme from 'files/fme'
import gmd from 'files/gmd'
import o3d from 'files/3do'
import bm from 'files/bm'
import wax from 'files/wax'
import voc from 'files/voc'
import FileManager from '../files/FileManager';

/**
 * Builds a vertexbuffer wall
 * @param {Sector} sector
 * @param {*} wall
 * @param {number} sy
 * @param {number} ey
 * @param {number} [offsetU=0]
 * @param {number} [offsetV=0]
 * @returns {Array<number>}
 */
function buildWall(sector, wall, sy, ey, offsetU = 0, offsetV = 0) {
  const [sx, sz] = sector.vertices[wall.left]
  const [ex, ez] = sector.vertices[wall.right]
  const u = Math.hypot(ex - sx, ez - sz)
  const v = Math.abs(ey - sy)
  const [su, sv] = [0, 0]
  const [eu, ev] = [u + offsetU, v + offsetV]
  return [
    sx, sy, sz, su, sv,
    ex, sy, ez, eu, sv,
    ex, ey, ez, eu, ev,
    sx, ey, sz, su, ev
  ]
}

/**
 * Buids a mid wall
 * @param {Sector} sector
 * @param {Wall} wall
 * @returns {Array<number>}
 */
function buildMidWall(sector, wall) {
  return buildWall(sector, wall, sector.ceilingAltitude, sector.floorAltitude, sector.midx, sector.midy)
}

/**
 * Builds an adjoined wall
 * @param {Sector} sector
 * @param {Wall} wall
 * @returns {Array<number>}
 */
function buildAdjoinedTopWall(sector, adjoined, wall) {
  const a = sector
  const b = adjoined
  const sy = Math.min(a.ceilingAltitude, b.ceilingAltitude)
  const ey = Math.max(a.ceilingAltitude, b.ceilingAltitude)
  return buildWall(sector, wall, sy, ey, sector.topx, sector.topy)
}

/**
 * Builds an adjoined wall
 * @param {Sector} sector
 * @param {Wall} wall
 * @returns {Array<number>}
 */
function buildAdjoinedBottomWall(sector, adjoined, wall) {
  const a = sector
  const b = adjoined
  const sy = Math.min(a.floorAltitude, b.floorAltitude)
  const ey = Math.max(a.floorAltitude, b.floorAltitude)
  return buildWall(sector, wall, sy, ey, sector.bottomx, sector.bottomy)
}

/**
 * Builds a vertexbuffer plane
 * @param {Sector} sector
 * @param {number} altitude
 * @returns {Array<number>}
 */
function buildPlaneForward(sector, altitude, offsetU = 0, offsetV = 0) {
  const vertices = []
  const y = altitude
  for (let index = 0; index < sector.walls.length; index++) {
    const wall = sector.walls[index]
    const [x, z] = sector.vertices[wall.left]
    const [u, v] = sector.vertices[wall.left]
    vertices.push(x, y, z, u + offsetU, v + offsetV)
  }
  return vertices
}

function buildPlaneBackward(sector, altitude, offsetU = 0, offsetV = 0) {
  const vertices = []
  const y = altitude
  for (let index = sector.walls.length - 1; index >= 0; index--) {
    const wall = sector.walls[index]
    const [x, z] = sector.vertices[wall.left]
    const [u, v] = sector.vertices[wall.left]
    vertices.push(x, y, z, u + offsetU, v + offsetV)
  }
  return vertices
}

/**
 * Builds a vertexbuffer plane floor
 * @param {Sector} sector
 * @returns {Array<number>}
 */
function buildFloor(sector) {
  return buildPlaneForward(sector, sector.floorAltitude, sector.floorTexture.x, sector.floorTexture.y)
}

/**
 * Builds a vertexbuffer plane ceiling
 * @param {Sector} sector
 * @returns {Array<number>}
 */
function buildCeiling(sector) {
  return buildPlaneBackward(sector, sector.ceilingAltitude, sector.ceilingTexture.x, sector.ceilingTexture.y)
}

/**
 * Computes the bounding box of a sector
 * @param {*} sector
 * @returns {BoundingBox}
 */
function computeSectorBoundingBox(sector) {
  let maxX = Number.MIN_VALUE
    , minX = Number.MAX_VALUE
    , maxY = Number.MIN_VALUE
    , minY = Number.MAX_VALUE
  const minZ = sector.ceilingAltitude
  const maxZ = sector.floorAltitude
  for (const wall of sector.walls) {
    const [x, y] = sector.vertices[wall.left]
    maxX = Math.max(maxX, x)
    minX = Math.min(minX, x)
    maxY = Math.max(maxY, y)
    minY = Math.min(minY, y)
  }
  return [
    minX, maxX,
    minY, maxY,
    minZ, maxZ
  ]
}

/**
 * Loads a level
 * @param {FileManager} fm - FileManager.
 * @param {string} name - Level name.
 */
export async function load(fm, name) {
  const upperCaseName = name.toUpperCase()
  console.log(`Loading ${upperCaseName}.LEV`)
  const basic = await fm.fetch(`${upperCaseName}.LEV`)
  const sectors = basic.sectors.map((sector) => {
    sector.walls.forEach((wall) => {
      wall.midGeometry = null
      wall.midBuffer = null
      wall.topGeometry = null
      wall.topBuffer = null
      wall.bottomGeometry = null
      wall.bottomBuffer = null
      if (wall.adjoin < 0) {
        wall.midGeometry = buildMidWall(sector, wall)
      } else {
        wall.topGeometry = buildAdjoinedTopWall(sector, basic.sectors[wall.adjoin], wall)
        wall.bottomGeometry = buildAdjoinedBottomWall(sector, basic.sectors[wall.adjoin], wall)
      }
      return wall
    })
    return {
      ...sector,
      boundingBox: computeSectorBoundingBox(sector),
      wallColor: new Float32Array([Math.random(), Math.random(), Math.random()]),
      planeColor: new Float32Array([Math.random(), Math.random(), Math.random()]),
      floorGeometry: buildFloor(sector),
      floorBuffer: null,
      ceilingGeometry: buildCeiling(sector),
      ceilingBuffer: null
    }
  })
  console.log(`Loading palette ${basic.palette}`)
  const palette = await fm.fetch(basic.palette)
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
  debugger
  console.log(textures)
  console.log(`Loading ${upperCaseName}.O`)
  const objects = await fm.fetch(`${upperCaseName}.O`)
  console.log(objects)
  console.log(`Loading meshes ${objects.podCount}`)
  const meshes = await Promise.all(objects.pods.map((current) => {
    console.log(`Loading mesh ${current}`)
    return fm.fetch(current)
  }))
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
    sectors: sectors,
    objects: objects.objects,
    palette,
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
