#ifdef VERTEX_SHADER

layout(location = 0) in vec2 a_position;

uniform sampler2D mipmap_DEM_texture;
uniform sampler2D mipmap_HS_texture;
uniform mat4 u_projMatrix;
uniform mat4 u_modelMatrix;
uniform vec4 pixelRange;
uniform float mipmapLevel;
uniform float u_skirtHeight;

const float MAPBOX_TILE_EXTENT = 8192.0;
const float SKIRT_OFFSET = 24575.0;
// const float SKIRT_HEIGHT = 100.0;

out float v_height;
out float v_hillShade;

vec3 decomposeToPosAndSkirt(vec2 posWithComposedSkirt) {
    float skirt = float(posWithComposedSkirt.x >= SKIRT_OFFSET);
    vec2 pos = posWithComposedSkirt - vec2(skirt * SKIRT_OFFSET, 0.0);
    return vec3(pos, skirt);
}

// validRange: [minX, maxX, minY, maxY]
bool boundsCheck(vec2 coords, vec4 validRange) {

    float tolerances = 0.0001;
    bool isBounds = false;
    if(coords.x < validRange.x + tolerances || coords.x > validRange.y - tolerances ||
        coords.y < validRange.z + tolerances || coords.y > validRange.w - tolerances) {
        isBounds = true;
    }
    return isBounds;
}

// vec2 coordsAdjust(vec2 normCoord, vec2 texSize) {

//     vec2 validRange_x = vec2(pixelRange.x, pixelRange.z) / texSize.x;
//     vec2 validRange_y = vec2(pixelRange.y, pixelRange.w) / texSize.y;

//     vec2 adjustedCoord = vec2(validRange_x.x + (validRange_x.y - validRange_x.x) * normCoord.x, validRange_y.x + (validRange_y.y - validRange_y.x) * (1.0 - normCoord.y));
//     return adjustedCoord;
// }

void main() {

    vec3 pos_skirt = decomposeToPosAndSkirt(a_position);
    vec2 pos = pos_skirt.xy;
    float skirt = pos_skirt.z;

    vec2 normUV = clamp(vec2(pos.x, pos.y) / MAPBOX_TILE_EXTENT, vec2(0.0), vec2(1.0));
    vec2 largeDim = vec2(textureSize(mipmap_DEM_texture, int(mipmapLevel)));

    vec4 validRange = vec4(vec2(pixelRange.x, pixelRange.z) / largeDim.x, vec2(pixelRange.y, pixelRange.w) / largeDim.y);
    vec2 adjustedUV = vec2(validRange.x + (validRange.y - validRange.x) * normUV.x, validRange.z + (validRange.w - validRange.z) * (1.0 - normUV.y));
    bool isBounds = boundsCheck(adjustedUV, validRange);

    vec2 corretUV = adjustedUV;

    float height = textureLod(mipmap_DEM_texture, corretUV, mipmapLevel).r;// real height
    float hillshade = textureLod(mipmap_HS_texture, corretUV, mipmapLevel).r;// 0-1

    // float z = 30.0 * height - skirt * 10000.0;
    float z = 30.0 * height;
    // float z = 30.0 * height;
    gl_Position = u_projMatrix * u_modelMatrix * vec4(pos.xy, z, 1.0);

    // gl_Position = u_projMatrix * u_modelMatrix * vec4(pos.xy, 30.0 * height, 1.0);

    v_height = height;
    v_hillShade = hillshade;
}

#endif

#ifdef FRAGMENT_SHADER

precision highp float;

in float v_height;
in float v_hillShade;

out vec4 outColor;

void main() {

    outColor = vec4(v_height, v_hillShade, 0.0, 0.0);
}
#endif