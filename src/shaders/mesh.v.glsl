precision highp float;

attribute vec3 a_coords;

uniform mat4 u_mvp;

void main() {
  vec4 position = u_mvp * vec4(a_coords.x, a_coords.y, a_coords.z, 1.0);

  // FIXME: Esto es para solucionar los problemas que tengo a la hora de
  // renderizar la estrella de la muerte en el primer nivel SECBASE.LEV
  gl_PointSize = 4.0;

  gl_Position = vec4(position.x, -position.y, position.z, position.w);
}
