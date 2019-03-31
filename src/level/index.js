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
 * Loads a complete level
 * @param {Map<string, DirectoryEntry>} entries
 * @param {string} name
 * @returns {Level}
 */
export function load(entries, name) {
  const upperCaseName = name.toUpperCase()
  console.log(`Loading ${upperCaseName}.LEV`)
  const basic = lev.parseEntry(entries.get(`${upperCaseName}.LEV`))
  console.log(`Loading palette ${basic.palette}`)
  const palette = pal.parseEntry(entries.get(basic.palette))
  console.log(`Loading music ${basic.music}`)
  if (!entries.has(basic.music)) {
    console.warn(`Cannot load ${basic.music}`)
  } else {
    const music = gmd.parseEntry(entries.get(basic.music))
  }
  console.log(`Loading textures ${basic.textureCount}`)
  const textures = basic.textures.map((current, index, list) => {
    console.log(`Loading texture ${current} (${index}/${list.length})`)
    if (!entries.has(current)) {
      console.warn(`Cannot load ${current}`)
    } else {
      bm.parseEntry(entries.get(current))
    }
  })
  console.log(`Loading ${upperCaseName}.O`)
  const objects = o.parseEntry(entries.get(`${upperCaseName}.O`))
  console.log(`Loading meshes ${objects.podCount}`)
  const meshes = objects.pods.map(current => o3d.parseEntry(entries.get(current)))
  console.log(`Loading frames ${objects.frameCount}`)
  const frames = objects.frames.map(current => fme.parseEntry(entries.get(current)))
  console.log(`Loading sprites ${objects.spriteCount}`)
  const sprites = objects.sprites.map(current => wax.parseEntry(entries.get(current)))
  console.log(`Loading sounds ${objects.soundCount}`)
  const sounds = objects.sounds.map(current => voc.parseEntry(entries.get(current)))
  console.log(`Loading ${upperCaseName}.INF`)
  const info = inf.parseEntry(entries.get(`${upperCaseName}.INF`))
  console.log(`Loading ${upperCaseName}.GOL`)
  const goals = gol.parseEntry(entries.get(`${upperCaseName}.GOL`))

  return {
    palette,
    music,
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
