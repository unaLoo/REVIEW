#version 300 es

in vec2 a_position;
in vec3 a_color;
uniform vec2 u_resolution;
uniform float u_size;

out vec2 param;
out vec3 color;

const vec2[4] vertexes = vec2[4](vec2(-1, -1), vec2(-1, 1), vec2(1, -1), vec2(1, 1));

void main() {

    int index = int(gl_VertexID);
    vec2 offset = vertexes[index];
    vec2 position = a_position + offset * u_size / u_resolution;
    param = offset;
    color = a_color;
    gl_Position = vec4(position, 0, 1);
    // gl_PointSize = 10.0;
}