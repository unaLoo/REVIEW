#version 300 es

in vec2 a_position;
in vec2 a_texCoord;

uniform sampler2D myTexture;

out vec2 v_texCoord;

void main() {

    gl_Position = vec4(a_position, 0.0f, 1.0f);
    v_texCoord = a_texCoord;
}