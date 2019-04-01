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

/**
 * Builds a vertexbuffer wall
 * @param {*} sector
 * @param {*} wall
 */
function buildWall(sector, wall) {
  const sy = sector.ceilingAltitude
  const ey = sector.floorAltitude
  const [sx, sz] = sector.vertices[wall.left]
  const [ex, ez] = sector.vertices[wall.right]
  return [
    sx, sy, sz,
    ex, sy, ez,
    ex, ey, ez,
    sx, ey, sz
  ]
}

/**
 * Builds an adjoined wall
 * @param {*} sector
 * @param {*} wall
 */
function buildAdjoinedTopWall(sector, adjoined, wall) {
  const a = sector
  const b = adjoined
  const sy = a.ceilingAltitude
  const ey = b.ceilingAltitude
  const [sx, sz] = sector.vertices[wall.left]
  const [ex, ez] = sector.vertices[wall.right]
  return [
    sx, sy, sz,
    ex, sy, ez,
    ex, ey, ez,
    sx, ey, sz
  ]
}

/**
 * Builds an adjoined wall
 * @param {*} sector
 * @param {*} wall
 */
function buildAdjoinedBottomWall(sector, adjoined, wall) {
  const a = sector
  const b = adjoined
  const sy = a.floorAltitude
  const ey = b.floorAltitude
  const [sx, sz] = sector.vertices[wall.left]
  const [ex, ez] = sector.vertices[wall.right]
  return [
    sx, sy, sz,
    ex, sy, ez,
    ex, ey, ez,
    sx, ey, sz
  ]
}

/**
 * Builds a vertexbuffer plane
 * @param {*} sector
 * @param {*} altitude
 */
function buildPlane(sector, altitude) {
  const vertices = []
  const y = altitude
  for (const wall of sector.walls) {
    const [x, z] = sector.vertices[wall.left]
    vertices.push(x, y, z)
  }
  return vertices
}

/**
 * Builds a vertexbuffer plane floor
 * @param {Sector} sector
 */
function buildFloor(sector) {
  return buildPlane(sector, sector.floorAltitude)
}

/**
 * Builds a vertexbuffer plane ceiling
 * @param {Sector} sector
 */
function buildCeiling(sector) {
  return buildPlane(sector, sector.ceilingAltitude)
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
    const [sx, sy] = sector.vertices[wall.left]
    //const [ex, ey] = sector.vertices[wall.right]
    maxX = Math.max(maxX, sx)
    minX = Math.min(minX, sx)
    maxY = Math.max(maxY, sy)
    minY = Math.min(minY, sy)
  }
  return [
    minX, maxX,
    minY, maxY,
    minZ, maxZ
  ]
}

/**
 * Loads a complete level
 * @param {Map<string, DirectoryEntry>} entries
 * @param {string} name
 * @returns {Level}
 */
export function load(entries, name) {
  const upperCaseName = name.toUpperCase()
  console.log(`Loading ${upperCaseName}.LEV`)
  const basic = lev.parseEntry(entries.get(`${upperCaseName}.LEV`))
  const sectors = basic.sectors.map((sector) => {
    sector.walls.forEach((wall) => {
      wall.midGeometry = null
      wall.midBuffer = null
      wall.topGeometry = null
      wall.topBuffer = null
      wall.bottomGeometry = null
      wall.bottomBuffer = null
      if (wall.adjoin < 0) {
        wall.midGeometry = buildWall(sector, wall)
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
  const palette = pal.parseEntry(entries.get(basic.palette))
  /*
  console.log(`Loading music ${basic.music}`)
  if (!entries.has(basic.music)) {
    console.warn(`Cannot load ${basic.music}`)
  } else {
    const music = gmd.parseEntry(entries.get(basic.music))
  }
  */
  console.log(`Loading textures ${basic.textureCount}`)
  const textures = basic.textures.map((current, index, list) => {
    console.log(`Loading texture ${current} (${index}/${list.length})`)
    if (!entries.has(current)) {
      console.warn(`Cannot load ${current}`)
    } else {
      return bm.use(bm.parseEntry(entries.get(current)), palette)
    }
  })
  console.log(`Loading ${upperCaseName}.O`)
  const objects = o.parseEntry(entries.get(`${upperCaseName}.O`))
  console.log(`Loading meshes ${objects.podCount}`)
  const meshes = objects.pods.map((current) => {
    console.log(`Loading mesh ${current}`)
    if (!entries.has(current)) {
      console.warn(`Cannot load ${current}`)
    } else {
      return o3d.parseEntry(entries.get(current))
    }
  })
  console.log(`Loading frames ${objects.frameCount}`)
  const frames = objects.frames.map((current) => {
    console.log(`Loading frame ${current}`)
    return fme.parseEntry(entries.get(current))
  })
  console.log(`Loading sprites ${objects.spriteCount}`)
  const sprites = objects.sprites.map((current) => {
    console.log(`Loading sprite ${current}`)
    return wax.parseEntry(entries.get(current))
  })
  console.log(`Loading sounds ${objects.soundCount}`)
  const sounds = objects.sounds.map((current) => {
    console.log(`Loading sound ${current}`)
    return voc.parseEntry(entries.get(current))
  })
  console.log(`Loading ${upperCaseName}.INF`)
  const info = inf.parseEntry(entries.get(`${upperCaseName}.INF`))
  console.log(info)
  console.log(`Loading ${upperCaseName}.GOL`)
  const goals = gol.parseEntry(entries.get(`${upperCaseName}.GOL`))
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
