#version 300 es
uniform mat4 u_matrix;
uniform vec2 canvasSize;
uniform float size;
const vec2 pos[4] = vec2[4](vec2(0.0f, 0.0f), vec2(1.0f, 0.0f), vec2(1.0f, 1.0f), vec2(0.0f, 1.0f));
void main() {
    vec2 vertexPos = pos[gl_VertexID] * size;
    gl_Position = u_matrix * vec4(vertexPos / canvasSize, 0.0f, 1.0f);
}