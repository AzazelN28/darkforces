/** @module files/3do */
import dataViewUtils from 'utils/dataView'
import { createParseEntry, parseContent, parseLine } from 'utils/parse'

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
      if (version !== '1.2') {
        throw new Error('Invalid 3DO version')
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
      const [name] = parseLine('OBJECT "{a}"', line)
      object = {
        name
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
      const [count] = parseLine('QUADS {n}', line)
      object.numQuads = count
      object.quads = []
      return 'object-entry-polygon-entry'
    },
    'object-entry-polygon-entry': (line) => {
      const [,a,b,c,d,color,texture] = parseLine(' {n}: {n} {n} {n} {n} {n} {a}', line)
      object.quads.push([a,b,c,d,color,texture])
      if (object.quads.length < object.numQuads) {
        return 'object-entry-polygon-entry'
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
    'object-entry-texture-vertex-count': (line) => {
      const [count] = parseLine('TEXTURE VERTICES {n}', line)
      object.texture.numVertices = count
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
