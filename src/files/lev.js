/** @module files/lev */
import dataViewUtils from 'utils/dataView'
import { parseContent, parseLine } from '../utils/parse'

/**
 * Parses a .LEV file.
 * @param {DataView} dataView
 * @param {number} start
 * @param {number} size
 */
export function parse(dataView, start, size) {
  const content = dataViewUtils.toString(dataView, start, size)

  function createEmptySector() {
    return {
      name: null,
      light: null,
      floor: null,
      ceiling: null,
      second: null,
      vertexCount: null,
      vertices: [],
      wallCount: null,
      walls: []
    }
  }

  let levelName
    , levelPalette
    , levelMusic
    , parallaxX
    , parallaxY
    , textureCount
    , textures = []
    , sectorCount
    , sectors = []
    , sector = createEmptySector()

  parseContent(content, 'version', {
    'version': (line) => {
      const [version] = parseLine('LEV {v}', line)
      if (version !== '2.1') {
        throw new Error('Invalid LEV version')
      }
      return 'level-name'
    },
    'level-name': (line) => {
      const [name] = parseLine('LEVELNAME {a}', line)
      levelName = name
      return 'palette'
    },
    'palette': (line) => {
      const [name] = parseLine('PALETTE {a}', line)
      levelPalette = name.toUpperCase().trim()
      return 'music'
    },
    'music': (line) => {
      const [name] = parseLine('MUSIC {a}', line)
      levelMusic = name.toUpperCase().trim()
      return 'parallax'
    },
    'parallax': (line) => {
      const [x, y] = parseLine('PARALLAX {d} {d}', line)
      parallaxX = x
      parallaxY = y
      return 'texture-count'
    },
    'texture-count': (line) => {
      const [count] = parseLine('TEXTURES {n}', line)
      textureCount = count
      if (count > 0) {
        return 'texture'
      }
      return 'sector-count'
    },
    'texture': (line) => {
      const [name] = parseLine(' TEXTURE: {a}', line)
      textures.push(name)
      if (textures.length === textureCount) {
        return 'sector-count'
      }
      return 'texture'
    },
    'sector-count': (line) => {
      const [count] = parseLine('NUMSECTORS {n}', line)
      sectorCount = count
      return 'sector'
    },
    'sector': (line) => {
      const [index] = parseLine('SECTOR {n}', line)
      sector.index = index
      return 'sector-name'
    },
    'sector-name': (line) => {
      const [name] = parseLine(' NAME {a}', line)
      sector.name = name
      return 'sector-ambient'
    },
    'sector-ambient': (line) => {
      const [ambient] = parseLine(' AMBIENT {n}', line)
      sector.light = ambient
      return 'sector-floor-texture'
    },
    'sector-floor-texture': (line) => {
      const [index, x, y, flags] = parseLine(' FLOOR TEXTURE {n} {d} {d} {n}', line)
      if (sector.floor === null) {
        sector.floor = {
          texture: {
            index, x, y, flags
          },
          altitude: null
        }
      }
      return 'sector-floor-altitude'
    },
    'sector-floor-altitude': (line) => {
      const [altitude] = parseLine(' FLOOR ALTITUDE {d}', line)
      sector.floor.altitude = altitude
      return 'sector-ceiling-texture'
    },
    'sector-ceiling-texture': (line) => {
      const [index, x, y, flags] = parseLine(' CEILING TEXTURE {n} {d} {d} {n}', line)
      if (sector.ceiling === null) {
        sector.ceiling = {
          texture: {
            index, x, y, flags
          },
          altitude: null
        }
      }
      return 'sector-ceiling-altitude'
    },
    'sector-ceiling-altitude': (line) => {
      const [altitude] = parseLine(' CEILING ALTITUDE {d}', line)
      sector.ceiling.altitude = altitude
      return 'sector-second-altitude'
    },
    'sector-second-altitude': (line) => {
      const [altitude] = parseLine(' SECOND ALTITUDE {d}', line)
      sector.second = { altitude }
      return 'sector-flags'
    },
    'sector-flags': (line) => {
      const [x, y, z] = parseLine(' FLAGS {n} {n} {n}', line)
      sector.flags = [x, y, z]
      if (x !== 0 ||  y !== 0 || z !== 0) {
        console.log(sector)
      }
      return 'sector-layer'
    },
    'sector-layer': (line) => {
      const [layer] = parseLine(' LAYER {n}', line)
      sector.layer = layer
      return 'sector-vertex-count'
    },
    'sector-vertex-count': (line) => {
      const [count] = parseLine(' VERTICES {n}', line)
      sector.vertexCount = count
      return 'sector-vertex'
    },
    'sector-vertex': (line) => {
      const [x, z] = parseLine('  X: {d} Z: {d}', line)
      sector.vertices.push([-x, z])
      if (sector.vertices.length === sector.vertexCount) {
        return 'sector-wall-count'
      }
      return 'sector-vertex'
    },
    'sector-wall-count': (line) => {
      const [count] = parseLine(' WALLS {n}', line)
      sector.wallCount = count
      return 'sector-wall'
    },
    'sector-wall': (line) => {
      const [left,right,midt,midx,midy,midr,topt,topx,topy,topr,bottomt,bottomx,bottomy,bottomr,sign,signx,signy,adjoin,mirror,walk,u,v,w,light] = parseLine(' WALL LEFT: {i} RIGHT: {i} MID: {i} {d} {d} {i} TOP: {i} {d} {d} {i} BOT: {i} {d} {d} {i} SIGN: {d} {d} {d} ADJOIN: {i} MIRROR: {i} WALK: {i} FLAGS: {n} {n} {n} LIGHT: {n}', line)
      const wall = {
        left,
        right,
        mid: {
          texture: midt,
          offset: [midx, midy],
          rotation: midr
        },
        top: {
          texture: topt,
          offset: [topx, topy],
          rotation: topr
        },
        bottom: {
          texture: bottomt,
          offset: [bottomx, bottomy],
          rotation: bottomr
        },
        sign: {
          value: sign,
          x: signx,
          y: signy,
        },
        adjoin,
        mirror,
        walk,
        flags: [u, v, w],
        light
      }
      if (u !== 0 || v !== 0 || w !== 0) {
        console.log(wall, sector)
      }
      sector.walls.push(wall)
      if (sector.wallCount === sector.walls.length) {
        sectors.push(sector)
        sector = createEmptySector()
        return 'sector'
      }
      return 'sector-wall'
    }
  })
  return {
    name: levelName,
    palette: levelPalette,
    music: levelMusic,
    parallax: [parallaxX, parallaxY],
    textureCount,
    textures,
    sectorCount,
    sectors
  }
}

/**
 * Parses a .LEV file from a directory entry
 * @param {DirectoryEntry} directoryEntry
 * @returns {LevelGeometry}
 */
export function parseEntry({ dataView, start, size }) {
  return parse(dataView, start, size)
}

export default {
  parse,
  parseEntry
}
