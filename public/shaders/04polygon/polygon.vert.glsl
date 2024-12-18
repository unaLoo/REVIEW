#version 300 es

layout(location = 0) in vec4 a_position;

uniform mat4 u_matrix;
out vec3 v_color;

void main() {
    v_color = vec3(1.0, 0.0f, 0.0f);
    gl_Position = u_matrix * a_position;
    gl_PointSize = 10.0;
}