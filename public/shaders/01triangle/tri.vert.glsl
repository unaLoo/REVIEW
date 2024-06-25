#version 300 es
// an attribute is an input (in) to a vertex shader.
// It will receive data from a buffer
in vec2 a_position;
in vec2 a_offset;
uniform vec2 u_resolution;
uniform float u_size;

// all shaders have a main function
void main() {

  // convert the position from pixels to 0.0 to 1.0

  vec2 pos = a_position + a_offset;
  // pos = a_position;

  vec2 normalized_postion = pos / u_resolution;
  vec2 position = vec2(normalized_postion.x * 2.0f - 1.0f, normalized_postion.y * 2.0f - 1.0f);

  // gl_Position is a special variable a vertex shader
  gl_Position = vec4(position * vec2(1.0f, -1.0f) * u_size, 0.0f, 1.0f);
}