/**
 * Creates a shader
 * @param {WebGLRenderingContextBase} gl
 * @param {number} type
 * @param {string} source
 * @returns {WebGLShader}
 */
export function createShader(gl, type, source) {
  const shader = gl.createShader(type)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader))
  }
  return shader
}

/**
 * Creates a new vertex shader
 * @param {WebGLRenderingContextBase} gl
 * @param {string} source
 * @returns {WebGLShader}
 */
export function createVertexShader(gl, source) {
  return createShader(gl, gl.VERTEX_SHADER, source)
}

/**
 * Creates a new fragment shader
 * @param {WebGLRenderingContextBase} gl
 * @param {string} source
 * @returns {WebGLShader}
 */
export function createFragmentShader(gl, source) {
  return createShader(gl, gl.FRAGMENT_SHADER, source)
}

export function deleteShader(gl, shader) {
  gl.deleteShader(shader)
}

export default {
  createShader,
  createVertexShader,
  createFragmentShader,
  deleteShader
}
