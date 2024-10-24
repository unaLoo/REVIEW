
#ifdef VERTEX_SHADER

layout(location = 0) in vec2 a_position;

uniform mat4 u_matrix;
uniform sampler2D float_dem_texture;

const float MAPBOX_TILE_EXTENT = 8192.0f;
const float SKIRT_OFFSET = 24575.0f;
const float Exaggeration = 30.0f;

out vec2 v_uv;
out float v_height;

vec3 decomposeToPosAndSkirt(vec2 posWithComposedSkirt) {
    float skirt = float(posWithComposedSkirt.x >= SKIRT_OFFSET);
    vec2 pos = posWithComposedSkirt - vec2(skirt * SKIRT_OFFSET, 0.0f);
    return vec3(pos, skirt);
}

vec2 uvCorrection(vec2 uv, vec2 dim) {
    return clamp(uv, vec2(0.0), dim - vec2(1.0));
}

float decodeFromTerrainRGB(vec3 rgb) {

    vec3 RGB = rgb * 255.0;    
    float height = -10000.0 + ((RGB.r * 256.0 * 256.0 + RGB.g * 256.0 + RGB.b) * 0.1);
    return height;
}

vec3 sampleTerrainRGBTexel(vec2 uv) {
    int dim = textureSize(float_dem_texture, 0).x - 2;
    vec2 scaled_uv = (float(dim) * uv + 1.5f) / (float(dim) + 2.0f);
    return texture(float_dem_texture, scaled_uv).rgb;
}

float sampleTerrainF32Texel(vec2 uv) {
    int dim = textureSize(float_dem_texture, 0).x - 2;
    vec2 scaled_uv = (float(dim) * uv + 1.5f) / (float(dim) + 2.0f);
    return texture(float_dem_texture, scaled_uv).r;
}


float linearSamplingTerrainRGB(sampler2D texture, vec2 uv, vec2 dim) {

    vec2 offsets[4] = vec2[](vec2(0.0, 0.0),vec2(1.0, 0.0),vec2(0.0, 1.0),vec2(1.0, 1.0));

    float tl = decodeFromTerrainRGB(sampleTerrainRGBTexel(uvCorrection(uv + offsets[0], dim) / dim));
    float tr = decodeFromTerrainRGB(sampleTerrainRGBTexel(uvCorrection(uv + offsets[1], dim) / dim));
    float bl = decodeFromTerrainRGB(sampleTerrainRGBTexel(uvCorrection(uv + offsets[2], dim) / dim));
    float br = decodeFromTerrainRGB(sampleTerrainRGBTexel(uvCorrection(uv + offsets[3], dim) / dim));
    float mix_x = fract(uv.x);
    float mix_y = fract(uv.y);
    float top = mix(tl, tr, mix_x);
    float bottom = mix(bl, br, mix_x);
    return mix(top, bottom, mix_y);
}

void main(){

    vec3 pos_skirt = decomposeToPosAndSkirt(a_position);
    vec2 pos = pos_skirt.xy;
    float skirt = pos_skirt.z;

    v_uv = clamp(vec2(pos.x, pos.y) / MAPBOX_TILE_EXTENT, vec2(0.0f), vec2(1.0f));
    vec2 dim = vec2(textureSize(float_dem_texture, 0));

    // float elevation = linearSamplingTerrainRGB(float_dem_texture, v_uv * dim, dim);

    // float elevation = decodeFromTerrainRGB(sampleTerrainRGBTexel(v_uv));
    // float height = elevation - skirt * 1000.0f;

    float height = Exaggeration * sampleTerrainF32Texel(v_uv) - skirt * 100.0f;
    gl_Position = u_matrix * vec4(pos.xy, height, 1.0);
    v_height = height;

}
#endif



#ifdef FRAGMENT_SHADER
precision highp float;

in vec2 v_uv;
in float v_height;

uniform sampler2D float_dem_texture;

out vec4 outColor;

const float opacity = 0.5f;

void main(){

    // outColor = texture(float_dem_texture, v_uv);
    // outColor = vec4(texture(float_dem_texture, v_uv).rgb, 0.5);
    outColor = vec4(0.0,0.5f,0.5f,1.0f) * opacity;
}
#endif