precision highp float;

attribute vec3 a_coords;
attribute vec2 a_texcoords;

uniform vec2 u_size;
uniform mat4 u_mvp;

varying vec2 v_texcoords;

const float c_size = 20.0;

void main() {
  vec4 position = u_mvp * vec4(a_coords.x * u_size.x / c_size, a_coords.y * u_size.y / c_size, a_coords.z, 1.0);

  gl_Position = vec4(position.x, -position.y, position.z, position.w);

  v_texcoords = a_texcoords;
}
