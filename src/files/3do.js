/** @module files/3do */
import dataViewUtils from 'utils/dataView'
import { createParseEntry, parseContent, parseLine, isLine } from 'utils/parse'

/**
 * Parses a .3DO file from a DataView
 * @param {DataView} dataView
 * @param {number} start
 * @param {number} size
 */
export function parse(dataView, start, size) {
  const content = dataViewUtils.toString(dataView, start, size)

  let objectName = null
    , objectPalette = null
    , numObjects = 0
    , numVertices = 0
    , numPolygons = 0
    , numTextures = 0
    , object = null
    , textures = []
    , objects = []

  parseContent(content, 'version', {
    'version': (line) => {
      const [version] = parseLine('3DO {v}', line)
      if (version !== '1.2' && version !== '1.20' && version !== '1.30') {
        throw new Error(`Invalid 3DO version, expected 1.2, 1.20 or 1.30, found ${version}`)
      }
      return 'name'
    },
    'name': (line) => {
      const [name] = parseLine('3DONAME {a}', line)
      objectName = name
      return 'object-count'
    },
    'object-count': (line) => {
      const [count] = parseLine('OBJECTS {n}', line)
      numObjects = count
      return 'vertices-count'
    },
    'vertices-count': (line) => {
      const [count] = parseLine('VERTICES {n}', line)
      numVertices = count
      return 'polygon-count'
    },
    'polygon-count': (line) => {
      const [count] = parseLine('POLYGONS {n}', line)
      numPolygons = count
      return 'palette'
    },
    'palette': (line) => {
      const [name] = parseLine('PALETTE {a}', line)
      objectPalette = name
      return 'texture-count'
    },
    'texture-count': (line) => {
      const [count] = parseLine('TEXTURES {n}', line)
      numTextures = count
      if (count === 0) {
        return 'object-entry-name'
      }
      return 'texture-entry'
    },
    'texture-entry': (line) => {
      const [name] = parseLine(' TEXTURE: {a}', line)
      textures.push(name)
      if (numTextures === textures.length) {
        return 'object-entry-name'
      }
      return 'texture-entry'
    },
    'object-entry-name': (line) => {
      const [name] = parseLine('OBJECT "{a}"?', line)
      object = {
        name,
        numVertices: 0,
        numTriangles: 0,
        numQuads: 0,
        vertices: [],
        triangles: [],
        quads: [],
        texture: {
          index: -1,
          numVertices: 0,
          numQuads: 0,
          numTriangles: 0,
          vertices: [],
          quads: [],
          triangles: []
        }
      }
      return 'object-entry-texture'
    },
    'object-entry-texture': (line) => {
      const [index] = parseLine('TEXTURE {i}', line)
      object.texture = { index }
      return 'object-entry-vertex-count'
    },
    'object-entry-vertex-count': (line) => {
      const [count] = parseLine('VERTICES {n}', line)
      object.numVertices = count
      object.vertices = []
      return 'object-entry-vertex-entry'
    },
    'object-entry-vertex-entry': (line) => {
      const [,x,y,z] = parseLine(' {n}: {d} {d} {d}', line)
      object.vertices.push([x,y,z])
      if (object.vertices.length === object.numVertices) {
        return 'object-entry-polygon-count'
      }
      return 'object-entry-vertex-entry'
    },
    'object-entry-polygon-count': (line) => {
      if (isLine('QUADS {n}', line)) {
        const [count] = parseLine('QUADS {n}', line)
        object.numQuads = count
        object.quads = []
        return 'object-entry-quad-entry'
      } else if (isLine('TRIANGLES {n}', line)) {
        const [count] = parseLine('TRIANGLES {n}', line)
        object.numTriangles = count
        object.triangles = []
        return 'object-entry-triangle-entry'
      } else {
        throw new Error('Invalid line')
      }
    },
    'object-entry-texture-vertex-count': (line) => {
      const [count] = parseLine('TEXTURE VERTICES {n}', line)
      object.texture.numVertices = count
      object.texture.vertices = []
      return 'object-entry-texture-vertex-entry'
    },
    'object-entry-texture-vertex-entry': (line) => {
      const [,x,y] = parseLine(' {n}: {d} {d}', line)
      object.texture.vertices.push([x,y])
      if (object.texture.vertices.length === object.texture.numVertices) {
        return 'object-entry-texture-polygon-count'
      }
      return 'object-entry-texture-vertex-entry'
    },
    'object-entry-texture-polygon-count': (line) => {
      const [count] = parseLine('TEXTURE QUADS {n}', line)
      object.texture.numQuads = count
      object.texture.quads = []
      return 'object-entry-texture-polygon-entry'
    },
    'object-entry-texture-polygon-entry': (line) => {
      const [,a,b,c,d] = parseLine(' {n}: {n} {n} {n} {n}', line)
      object.texture.quads.push([a,b,c,d])
      if (object.texture.quads.length < object.texture.numQuads) {
        return 'object-entry-texture-polygon-entry'
      }

      objects.push(object)
      object = null
      if (objects.length < numObjects) {
        return 'object-entry-name'
      }
    },
    'object-entry-quad-entry': (line) => {
      const [, a, b, c, d, color, texture] = parseLine(' {n}: {n} {n} {n} {n} {n} {a}', line)
      object.quads.push([a, b, c, d, color, texture])
      if (object.quads.length < object.numQuads) {
        return 'object-entry-quad-entry'
      }

      if (object.texture.index !== -1) {
        return 'object-entry-texture-vertex-count'
      }

      objects.push(object)
      object = null
      if (objects.length < numObjects) {
        return 'object-entry-name'
      }
    },
    'object-entry-triangle-entry': (line) => {
      const [, a, b, c, color, shading] = parseLine(' {n}: {n} {n} {n} {n} {a}', line)
      object.triangles.push([a, b, c, color, shading])
      if (object.triangles.length < object.numTriangles) {
        return 'object-entry-triangle-entry'
      }

      if (object.texture.index !== -1) {
        return 'object-entry-texture-vertex-count'
      }

      objects.push(object)
      object = null
      if (objects.length < numObjects) {
        return 'object-entry-name'
      }
    }
  })

  return {
    name: objectName,
    palette: objectPalette,
    numObjects,
    numPolygons,
    numVertices,
    numTextures,
    textures,
    objects,
  }
}

/**
 * Parses a .3DO file from a DirectoryEntry
 * @function
 * @param {DirectoryEntry} directoryEntry
 */
export const parseEntry = createParseEntry(parse)

export default {
  parse,
  parseEntry,
}
