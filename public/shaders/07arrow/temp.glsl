#version 300 es
uniform mat4 matrix;
const vec3[2] upLineVertices = vec3[2](vec3(0.0f, 0.0f, 0.0f), vec3(0.0f, 0.0f, 0.5f));
void main() {
    vec3 pos = upLineVertices[gl_VertexID];
    gl_Position = matrix * vec4(pos, 1.0f);
}
