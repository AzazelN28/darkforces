/**
 * Creates a new 2D texture
 * @param {WebGLRenderingContextBase} gl
 * @param {HTMLImageElement|HTMLCanvasElement|HTMLVideoElement|ImageData|ImageBitmap} imageData
 */
export function createTexture2D(gl, imageData, options = {}) {
  const { minFilter, magFilter, wrapS, wrapT } = {
    minFilter: gl.NEAREST,
    magFilter: gl.NEAREST,
    wrapS: gl.REPEAT,
    wrapT: gl.REPEAT,
    ...options
  }
  const texture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magFilter)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapS)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapT)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imageData)
  return texture
}

export default {
  createTexture2D
}
