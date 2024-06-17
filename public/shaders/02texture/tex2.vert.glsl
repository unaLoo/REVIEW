#version 300 es

in vec2 a_pos;
in vec2 a_uv;
uniform float flipY;

// uniform sampler2D myTexture;
// uniform vec2 u_resolution;

out vec2 v_uv;

void main() {

    v_uv = a_uv;
    gl_Position = vec4(a_pos * vec2(1.0f, flipY), 0.0f, 1.0f);

}
