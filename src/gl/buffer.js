/**
 * Crea un buffer
 * @param {WebGLRenderingContextBase} gl - Contexto de WebGL
 * @param {ArrayBufferLike} data - Datos del buffer
 * @param {number} target - Tipo de buffer
 * @param {number} [usage=gl.STATIC_DRAW] - Tipo de dibujado
 * @returns {WebGLBuffer}
 */
export function createBuffer(gl, data, target = gl.ARRAY_BUFFER, usage = gl.STATIC_DRAW) {
  const buffer = gl.createBuffer()
  gl.bindBuffer(target, buffer)
  gl.bufferData(target, data, usage)
  return buffer
}

/**
 * Crea un buffer para vértices
 * @param {WebGLRenderingContextBase} gl - Contexto de WebGL
 * @param {ArrayBufferLike} data - Datos del buffer
 * @param {number} [usage=gl.STATIC_DRAW] - Tipo de dibujado
 */
export function createVertexBuffer(gl, data, usage = gl.STATIC_DRAW) {
  return createBuffer(gl, data, gl.ARRAY_BUFFER, usage)
}

/**
 * Crea un buffer para índices
 * @param {WebGLRenderingContextBase} gl - Contexto de WebGL
 * @param {ArrayBufferLike} data - Datos del buffer
 * @param {number} [usage=gl.STATIC_DRAW] - Tipo de dibujado
 */
export function createIndexBuffer(gl, data, usage = gl.STATIC_DRAW) {
  return createBuffer(gl, data, gl.ELEMENT_ARRAY_BUFFER, usage)
}

export default {
  createBuffer,
  createVertexBuffer,
  createIndexBuffer
}
