#ifdef VERTEX_SHADER

uniform vec2 renderTargetSize;
uniform vec4 pixelRange;
uniform sampler2D float_dem_texture;
// out vec2 texcoords;

const float blockSize = 512.0;

vec4[] vertices = vec4[4](vec4(-1.0, -1.0, 0.0, 0.0), vec4(1.0, -1.0, 1.0, 0.0), vec4(-1.0, 1.0, 0.0, 1.0), vec4(1.0, 1.0, 1.0, 1.0));

vec2 offset[] = vec2[4](
    vec2(0.0, 0.0),
    vec2(1.0, 0.0),
    vec2(0.0, 1.0),
    vec2(1.0, 1.0)
);

void main() {

    // vec4 attributes = vertices[gl_VertexID];

    vec2 baseVertex = vec2(
        pixelRange.x / renderTargetSize.x,
        pixelRange.y / renderTargetSize.y
    );
    vec2 vertex = baseVertex + offset[gl_VertexID] * blockSize / renderTargetSize;
    
    vertex = vertex * 2.0 - 1.0;

    gl_Position = vec4(vertex, 0.0, 1.0);
    // texcoords = attributes.zw;
}

#endif

#ifdef FRAGMENT_SHADER

precision highp float;
precision highp usampler2D;

uniform vec2 renderTargetSize;
uniform vec4 pixelRange;
uniform sampler2D float_dem_texture;

// out float fragColor; // output to the R32f texture
out vec4 fragColor;

vec2 uvCorrection(vec2 uv) {

    return clamp(uv, vec2(0.0), vec2(1.0));
}

float coordsValid(vec2 coords) {

    if(coords.x < pixelRange[0] || coords.x > pixelRange[2] || coords.y < pixelRange[1] || coords.y > pixelRange[3])
        return 0.0;
    return 1.0;
}

vec2 coordsToUV(vec2 coords) {

    vec2 uv = vec2(0.0);
    uv.x = ((coords.x - pixelRange[0]) / (pixelRange[2] - pixelRange[0]));
    uv.y = 1.0 - ((coords.y - pixelRange[1]) / (pixelRange[3] - pixelRange[1]));
    return uv;
}

float sampleTerrainF32Texel(vec2 uv, vec2 dim) {

    vec2 _uv = uvCorrection(uv);
    vec2 scaled_uv = (dim * _uv + 1.5) / (dim + 2.0);
    return texture(float_dem_texture, scaled_uv).r;
    // return texture(float_dem_texture, uv).r;
}

float linearSamplingF32TerrainHeight(vec2 uv, vec2 dim) {

    vec2 offsets[4] = vec2[](vec2(0.0, 0.0), vec2(1.0, 0.0), vec2(0.0, 1.0), vec2(1.0, 1.0));

    float tl = sampleTerrainF32Texel(uv + offsets[0] / dim, dim);
    float tr = sampleTerrainF32Texel(uv + offsets[1] / dim, dim); // E
    float bl = sampleTerrainF32Texel(uv + offsets[2] / dim, dim); // N
    float br = sampleTerrainF32Texel(uv + offsets[3] / dim, dim);

    float mix_x = fract(uv.x * dim.x);
    float mix_y = fract(uv.y * dim.y);
    float top = mix(tl, tr, mix_x);
    float bottom = mix(bl, br, mix_x);
    return mix(top, bottom, mix_y);
}

void main() {

    vec2 fragCoord = gl_FragCoord.xy;
    // fragColor = vec4(1.0, 0.0, 0.0, 1.0);
    // if(coordsValid(fragCoord) == 0.0) {
    //     //保持原值 , 用alpha通道来和源图像混色 
    //     fragColor = vec4(0.0, 0.0, 0.0, 0.0);
    //     return;
    // }
    // fragColor = vec4(0.4, 0.0, 0.0, 1.0);

    vec2 uv = coordsToUV(fragCoord);
    vec2 dim = vec2(textureSize(float_dem_texture, 0)) - 2.0;

    float height = linearSamplingF32TerrainHeight(uv, dim);

    // // fragColor = height;
    fragColor = vec4(height, 0.0, 0.0, 1.0);

}

#endif