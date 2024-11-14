#ifdef VERTEX_SHADER

vec2[] texCoords = vec2[4](vec2(0.0, 0.0), vec2(1.0, 0.0), vec2(0.0, 1.0), vec2(1.0, 1.0));

layout(location = 0) in vec2 position;

uniform mat4 u_matrix;

out vec2 v_texCoords;

void main() {
    // must be LeftBottom, RightBottom, LeftTop, RightTop
    gl_Position = u_matrix * vec4(position, 0.0, 1.0);
    v_texCoords = texCoords[gl_VertexID];
}

#endif
#ifdef FRAGMENT_SHADER
precision highp float;
in vec2 v_texCoords;

uniform sampler2D mipmapHStexture;
uniform float mipmapLevel;
uniform vec4 pixelRange;

out vec4 fragColor;

vec2 coordsAdjust(vec2 normCoord, vec2 texSize) {
    vec2 validRange_x = vec2(pixelRange.x, pixelRange.z) / texSize.x;
    vec2 validRange_y = vec2(pixelRange.y, pixelRange.w) / texSize.y;
    vec2 adjustedCoord = vec2(validRange_x.x + (validRange_x.y - validRange_x.x) * normCoord.x, validRange_y.x + (validRange_y.y - validRange_y.x) * normCoord.y);
    return adjustedCoord;
}

void main() {
    vec2 dim = vec2(textureSize(mipmapHStexture, int(mipmapLevel)));
    vec2 coord = coordsAdjust(v_texCoords, dim);
    ivec2 icoord = ivec2(coord * dim);
    vec4 color = texelFetch(mipmapHStexture, icoord, int(mipmapLevel));
    // vec4 color = texture(mipmapHStexture, coord);
    // vec4 color = vec4(mipmapLevel / 2.0, 0.0, 0.0, 1.0);
    fragColor = color;
}

#endif