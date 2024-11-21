#ifdef VERTEX_SHADER

precision highp float;

out vec2 texcoords;

vec4[] vertices = vec4[4](vec4(-1.0, -1.0, 0.0, 0.0), vec4(1.0, -1.0, 1.0, 0.0), vec4(-1.0, 1.0, 0.0, 1.0), vec4(1.0, 1.0, 1.0, 1.0));

void main() {

    vec4 attributes = vertices[gl_VertexID];

    gl_Position = vec4(attributes.xy, 0.0, 1.0);
    texcoords = attributes.zw;
}

#endif

#ifdef FRAGMENT_SHADER

precision highp int;
precision highp float;
precision highp usampler2D;

in vec2 texcoords;

uniform sampler2D contourTexture;
uniform sampler2D waterSurfaceTexture;
uniform sampler2D maskTexture;

out vec4 fragColor;

float validFragment(vec2 uv) {
    return texture(maskTexture, uv).r;
}

void main() {

    if(validFragment(texcoords) == 0.0) {
        return;
    }

    vec4 ContourColor = texture(contourTexture, texcoords);
    vec4 WaterSurfaceColor = texture(waterSurfaceTexture, texcoords);

    vec3 contourOutColor = ContourColor.rgb;
    vec3 waterSurfaceOutColor = WaterSurfaceColor.rgb;

    vec3 outColor = mix(contourOutColor, waterSurfaceOutColor, 0.5);

    float alpha = ContourColor.r < 9999.0 ? 1.0 : 0.0;
    fragColor = vec4(outColor, alpha);

    // fragColor = vec4((M.r + 60.0) / 70.0, 0.5, 0.6, 1.0);
}

#endif