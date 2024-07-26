#version 300 es
precision highp float;

in vec2 v_velocity;
uniform sampler2D u_mask;
out vec2 fragColor;

void main() {

    vec2 fragCoord = gl_FragCoord.xy;
    vec2 screenSize = vec2(textureSize(u_mask, 0));
    vec2 uv = fragCoord / screenSize;
    float valid = texture(u_mask, uv).r;

    if(valid == 0.0f) {
        fragColor = vec2(0.0f);
        return;
    }

    fragColor = v_velocity;

}