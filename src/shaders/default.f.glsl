precision highp float;

uniform sampler2D u_sampler;
uniform vec2 u_texbase;
uniform float u_light;
uniform vec4 u_fogColor;

varying vec2 v_texcoords;
varying float v_depth;

void main() {
  // Calculates pixel color by using wall/sector light and depth.
  gl_FragColor = mix(
    texture2D(u_sampler, v_texcoords / u_texbase),
    u_fogColor / 256.0,
    v_depth
  ) * u_light;
}
