precision highp float;

uniform sampler2D u_sampler;
varying vec2 v_texcoords;

void main() {
  // Calculates pixel color by using wall/sector light and depth.
  gl_FragColor = texture2D(u_sampler, v_texcoords);
  // gl_FragColor = vec4(1.0,1.0,1.0,1.0);
}
