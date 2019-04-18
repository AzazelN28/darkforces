import { createVertexShader, createFragmentShader } from './shader'

/**
 * Creates a program
 * @param {WebGLRenderingContextBase} gl
 * @param {WebGLShader} vertexShader
 * @param {WebGLShader} fragmentShader
 * @returns {WebGLProgram}
 */
export function createProgram(gl, vertexShader, fragmentShader) {
  const program = gl.createProgram()
  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program))
  }
  return program
}

/**
 * Creates a program from the source of its shaders
 * @param {WebGLRenderingContextBase} gl
 * @param {string} vertexShaderSource
 * @param {string} fragmentShaderSource
 * @returns {WebGLProgram}
 */
export function createProgramFromSource(gl, vertexShaderSource, fragmentShaderSource) {
  return createProgram(
    gl,
    createVertexShader(gl, vertexShaderSource),
    createFragmentShader(gl, fragmentShaderSource)
  )
}

export default {
  createProgram,
  createProgramFromSource
}