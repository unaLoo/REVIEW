#version 300 es

in vec2 a_pos;
in vec2 a_uv;


// uniform sampler2D myTexture;
// uniform vec2 u_resolution;

out vec2 v_uv;

void main() {

    v_uv = a_uv;
    gl_Position = vec4(a_pos, 0.0f, 1.0f);

}
