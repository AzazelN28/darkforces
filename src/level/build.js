/**
 * This module is in charge of constructing all the geometry needed to render
 * a level using WebGL.
 * @module level/build
 */

/**
 * Builds a vertexbuffer wall
 * @param {Sector} sector
 * @param {Wall} wall
 * @param {number} sy
 * @param {number} ey
 * @param {number} [offsetU=0]
 * @param {number} [offsetV=0]
 * @returns {Array<number>}
 */
export function buildWall(sector, wall, sy, ey, offsetU = 0, offsetV = 0) {
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
export function buildMidWall(sector, wall) {
  return buildWall(sector, wall, sector.ceiling.altitude, sector.floor.altitude, sector.midx, sector.midy)
}

export function buildElevatorWall(sector, item, wall) {
  const firstStop = parseFloat(item.stops[0][0])
  const lastStop = parseFloat(item.stops[item.stops.length - 1][0])
  const height = lastStop - firstStop
  console.log('height', height)
  return buildWall(sector, wall, firstStop, firstStop + height, sector.midx, sector.midy)
}

/**
 * Builds an adjoined wall
 * @param {Sector} sector
 * @param {Sector} adjoined
 * @param {Wall} wall
 * @returns {Array<number>}
 */
export function buildAdjoinedTopWall(sector, adjoined, wall) {
  const a = sector
  const b = adjoined
  const sy = Math.min(a.ceiling.altitude, b.ceiling.altitude)
  const ey = Math.max(a.ceiling.altitude, b.ceiling.altitude)
  return buildWall(sector, wall, sy, ey, sector.topx, sector.topy)
}

/**
 * Builds an adjoined wall
 * @param {Sector} sector
 * @param {Sector} adjoined
 * @param {Wall} wall
 * @returns {Array<number>}
 */
export function buildAdjoinedBottomWall(sector, adjoined, wall) {
  const a = sector
  const b = adjoined
  const sy = Math.min(a.floor.altitude, b.floor.altitude)
  const ey = Math.max(a.floor.altitude, b.floor.altitude)
  return buildWall(sector, wall, sy, ey, sector.bottomx, sector.bottomy)
}

/**
 * Builds a vertexbuffer plane
 * @param {Sector} sector
 * @param {number} altitude
 * @param {number} [offsetU=0]
 * @param {number} [offsetV=0]
 * @returns {Array<number>}
 */
export function buildPlaneForward(sector, altitude, offsetU = 0, offsetV = 0) {
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

/**
 * Builds a vertex buffer plane in reverse order
 * @param {Sector} sector
 * @param {number} altitude
 * @param {number} [offsetU=0]
 * @param {number} [offsetV=0]
 */
export function buildPlaneBackward(sector, altitude, offsetU = 0, offsetV = 0) {
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
export function buildFloor(sector) {
  //return buildPlaneBackward(sector, sector.floor.altitude, sector.floor.texture.x, sector.floor.texture.y)
  return buildPlaneForward(sector, sector.floor.altitude, sector.floor.texture.x, sector.floor.texture.y)
}

/**
 * Builds a vertexbuffer plane ceiling
 * @param {Sector} sector
 * @returns {Array<number>}
 */
export function buildCeiling(sector) {
  return buildPlaneBackward(sector, sector.ceiling.altitude, sector.ceiling.texture.x, sector.ceiling.texture.y)
  //return buildPlaneForward(sector, sector.ceiling.altitude, sector.ceiling.texture.x, sector.ceiling.texture.y)
}

export default {
  buildWall,
  buildElevatorWall,
  buildMidWall,
  buildAdjoinedBottomWall,
  buildAdjoinedTopWall,
  buildCeiling,
  buildFloor
}
