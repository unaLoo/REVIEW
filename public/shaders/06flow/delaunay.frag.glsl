#version 300 es
precision highp float;

in vec2 v_velocity;

// uniform sampler2D u_maskTexture;

out vec2 fragColor;

void main() {
    if(v_velocity == vec2(0.0)){
        discard;
    }
    fragColor = v_velocity;
    // fragColor = vec4(v_velocity, 0.0f, 1.0f);
    // fragColor = vec4(1.0f, 0.0f, 0.0f, 1.0f);
}