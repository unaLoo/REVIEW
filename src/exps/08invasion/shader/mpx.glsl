#version 300 es
#define TERRAIN
#define TERRAIN_DEM_FLOAT_FORMAT
#define FOG
#define FOG_DITHERING
#define null
precision highp float;
// IMPORTANT:

// This prelude is injected in both vertex and fragment shader be wary
// of precision qualifiers as vertex and fragment precision may differ

#define EPSILON 0.0000001
#define PI 3.141592653589793

#ifdef RENDER_CUTOFF
    // Calculates cutoff and fade out based on the supplied params and depth value
    float cutoff_opacity(vec4 cutoff_params, float depth) {
        float near = cutoff_params.x;
        float far = cutoff_params.y;
        float cutoffStart = cutoff_params.z;
        float cutoffEnd = cutoff_params.w;
        float linearDepth = (depth - near) / (far - near);
        return clamp((linearDepth - cutoffStart) / (cutoffEnd - cutoffStart), 0.0, 1.0);
    }
#endif
// NOTE: This prelude is injected in the vertex shader only

#define EXTENT 8192.0
#define RAD_TO_DEG 180.0 / PI
#define DEG_TO_RAD PI / 180.0
#define GLOBE_RADIUS EXTENT / PI / 2.0

float wrap(float n, float min, float max) {
    float d = max - min;
    float w = mod(mod(n - min, d) + d, d) + min;
    return (w == min) ? max : w;
}
#ifdef PROJECTION_GLOBE_VIEW
    vec3 mercator_tile_position(mat4 matrix, vec2 tile_anchor, vec3 tile_id, vec2 mercator_center) {
        #ifndef PROJECTED_POS_ON_VIEWPORT
            // tile_id.z contains pow(2.0, coord.canonical.z)
            float tiles = tile_id.z;
            vec2 mercator = (tile_anchor / EXTENT + tile_id.xy) / tiles;
            mercator -= mercator_center;
            mercator.x = wrap(mercator.x, -0.5, 0.5);
            vec4 mercator_tile = vec4(mercator.xy * EXTENT, EXTENT / (2.0 * PI), 1.0);
            mercator_tile = matrix * mercator_tile;
            return mercator_tile.xyz;
        #else
            return vec3(0.0);
        #endif
    }
    vec3 mix_globe_mercator(vec3 globe, vec3 mercator, float t) {
        return mix(globe, mercator, t);
    }
    mat3 globe_mercator_surface_vectors(vec3 pos_normal, vec3 up_dir, float zoom_transition) {
        vec3 normal = zoom_transition == 0.0 ? pos_normal : normalize(mix(pos_normal, up_dir, zoom_transition));
        vec3 xAxis = normalize(vec3(normal.z, 0.0, -normal.x));
        vec3 yAxis = normalize(cross(normal, xAxis));
        return mat3(xAxis, yAxis, normal);
    }
#endif // GLOBE_VIEW_PROJECTION
// Unpack a pair of values that have been packed into a single float.
// The packed values are assumed to be 8-bit unsigned integers, and are
// packed like so:
// packedValue = floor(input[0]) * 256 + input[1], vec2 unpack_float(const float packedValue) {
    int packedIntValue = int(packedValue);
    int v0 = packedIntValue / 256;
    return vec2(v0, packedIntValue - v0 * 256);
}
vec2 unpack_opacity(const float packedOpacity) {
    int intOpacity = int(packedOpacity) / 2;
    return vec2(float(intOpacity) / 127.0, mod(packedOpacity, 2.0));
}
// To minimize the number of attributes needed, we encode a 4-component
// color into a pair of floats (i.e. a vec2) as follows:
// [ floor(color.r * 255) * 256 + color.g * 255, //   floor(color.b * 255) * 256 + color.g * 255 ]
vec4 decode_color(const vec2 encodedColor) {
    return vec4(
    unpack_float(encodedColor[0]) / 255.0, unpack_float(encodedColor[1]) / 255.0
    );
}
// Unpack a pair of paint values and interpolate between them.
float unpack_mix_vec2(const vec2 packedValue, const float t) {
    return mix(packedValue[0], packedValue[1], t);
}
// Unpack a pair of paint values and interpolate between them.
vec4 unpack_mix_color(const vec4 packedColors, const float t) {
    vec4 minColor = decode_color(vec2(packedColors[0], packedColors[1]));
    vec4 maxColor = decode_color(vec2(packedColors[2], packedColors[3]));
    return mix(minColor, maxColor, t);
}
// The offset depends on how many pixels are between the world origin and the edge of the tile:
// vec2 offset = mod(pixel_coord, size)
//
// At high zoom levels there are a ton of pixels between the world origin and the edge of the tile.
// The glsl spec only guarantees 16 bits of precision for highp floats. We need more than that.
//
// The pixel_coord is passed in as two 16 bit values:
// pixel_coord_upper = floor(pixel_coord / 2^16)
// pixel_coord_lower = mod(pixel_coord, 2^16)
//
// The offset is calculated in a series of steps that should preserve this precision:
vec2 get_pattern_pos(const vec2 pixel_coord_upper, const vec2 pixel_coord_lower, const vec2 pattern_size, const float tile_units_to_pixels, const vec2 pos) {
    vec2 offset = mod(mod(mod(pixel_coord_upper, pattern_size) * 256.0, pattern_size) * 256.0 + pixel_coord_lower, pattern_size);
    return (tile_units_to_pixels * pos + offset) / pattern_size;
}
float mercatorXfromLng(float lng) {
    return (180.0 + lng) / 360.0;
}
float mercatorYfromLat(float lat) {
    return (180.0 - (RAD_TO_DEG * log(tan(PI / 4.0 + lat / 2.0 * DEG_TO_RAD)))) / 360.0;
}
vec3 latLngToECEF(vec2 latLng) {
    latLng = DEG_TO_RAD * latLng;
    float cosLat = cos(latLng[0]);
    float sinLat = sin(latLng[0]);
    float cosLng = cos(latLng[1]);
    float sinLng = sin(latLng[1]);
    
    // Convert lat & lng to spherical representation. Use zoom = 0 as a reference
    
    float sx = cosLat * sinLng * GLOBE_RADIUS;
    float sy = -sinLat * GLOBE_RADIUS;
    float sz = cosLat * cosLng * GLOBE_RADIUS;
    return vec3(sx, sy, sz);
}
#ifdef RENDER_CUTOFF
    uniform vec4 u_cutoff_params;
    out float v_cutoff_opacity;
#endif

const vec4 AWAY = vec4(-1000.0, -1000.0, -1000.0, 1); // Normalized device coordinate that is not rendered.


// Handle skirt flag for terrain & globe shaders
const float skirtOffset = 24575.0;
vec3 decomposeToPosAndSkirt(vec2 posWithComposedSkirt) {
    float skirt = float(posWithComposedSkirt.x >= skirtOffset);
    vec2 pos = posWithComposedSkirt - vec2(skirt * skirtOffset, 0.0);
    return vec3(pos, skirt);
}
#ifdef FOG
    uniform mediump vec4 u_fog_color;
    uniform mediump vec2 u_fog_range;
    uniform mediump float u_fog_horizon_blend;
    uniform mediump mat4 u_fog_matrix;
    out vec3 v_fog_pos;
    float fog_range(float depth) {
        // Map [near, far] to [0, 1] without clamping
        return (depth - u_fog_range[0]) / (u_fog_range[1] - u_fog_range[0]);
    }
    // Assumes z up and camera_dir *normalized* (to avoid computing
    // its length multiple times for different functions).
    float fog_horizon_blending(vec3 camera_dir) {
        float t = max(0.0, camera_dir.z / u_fog_horizon_blend);
        // Factor of 3 chosen to roughly match smoothstep.
        
        // See: https://www.desmos.com/calculator/pub31lvshf
        return u_fog_color.a * exp(-3.0 * t * t);
    }
    // Compute a ramp for fog opacity
    //   - t: depth, rescaled to 0 at fogStart and 1 at fogEnd
    // See: https://www.desmos.com/calculator/3taufutxid
    float fog_opacity(float t) {
        const float decay = 6.0;
        float falloff = 1.0 - min(1.0, exp(-decay * t));
        
        // Cube without pow() to smooth the onset
        
        falloff *= falloff * falloff;
        
        // Scale and clip to 1 at the far limit
        
        return u_fog_color.a * min(1.0, 1.00747 * falloff);
    }
    vec3 fog_position(vec3 pos) {
        // The following function requires that u_fog_matrix be affine and
        // results in a vector with w = 1. Otherwise we must divide by w.
        return (u_fog_matrix * vec4(pos, 1.0)).xyz;
    }
    vec3 fog_position(vec2 pos) {
        return fog_position(vec3(pos, 0.0));
    }
    float fog(vec3 pos) {
        float depth = length(pos);
        float opacity = fog_opacity(fog_range(depth));
        return opacity * fog_horizon_blending(pos / depth);
    }
#endif
// Also declared in data/bucket/fill_extrusion_bucket.js
#define ELEVATION_SCALE 7.0
#define ELEVATION_OFFSET 450.0

#ifdef PROJECTION_GLOBE_VIEW
    uniform vec3 u_tile_tl_up;
    uniform vec3 u_tile_tr_up;
    uniform vec3 u_tile_br_up;
    uniform vec3 u_tile_bl_up;
    uniform float u_tile_up_scale;
    vec3 elevationVector(vec2 pos) {
        vec2 uv = pos / EXTENT;
        vec3 up = normalize(mix(
        mix(u_tile_tl_up, u_tile_tr_up, uv.xxx), mix(u_tile_bl_up, u_tile_br_up, uv.xxx), uv.yyy));
        return up * u_tile_up_scale;
    }
#else // PROJECTION_GLOBE_VIEW
    vec3 elevationVector(vec2 pos) {
        return vec3(0, 0, 1);
    }
#endif // PROJECTION_GLOBE_VIEW

#ifdef TERRAIN
    uniform highp sampler2D u_dem;
    uniform highp sampler2D u_dem_prev;
    uniform vec2 u_dem_tl;
    uniform vec2 u_dem_tl_prev;
    uniform float u_dem_scale;
    uniform float u_dem_scale_prev;
    uniform float u_dem_size; // Texture size without 1px border padding
    
    uniform float u_dem_lerp;
    uniform float u_exaggeration;
    uniform float u_meter_to_dem;
    uniform mat4 u_label_plane_matrix_inv;
    vec4 tileUvToDemSample(vec2 uv, float dem_size, float dem_scale, vec2 dem_tl) {
        vec2 pos = dem_size * (uv * dem_scale + dem_tl) + 1.0;
        vec2 f = fract(pos);
        return vec4((pos - f + 0.5) / (dem_size + 2.0), f);
    }
    float currentElevation(vec2 apos) {
        #ifdef TERRAIN_DEM_FLOAT_FORMAT
            vec2 pos = (u_dem_size * (apos / 8192.0 * u_dem_scale + u_dem_tl) + 1.5) / (u_dem_size + 2.0);
            return u_exaggeration * texture(u_dem, pos).r;
        #else // TERRAIN_DEM_FLOAT_FORMAT
            float dd = 1.0 / (u_dem_size + 2.0);
            vec4 r = tileUvToDemSample(apos / 8192.0, u_dem_size, u_dem_scale, u_dem_tl);
            vec2 pos = r.xy;
            vec2 f = r.zw;
            float tl = texture(u_dem, pos).r;
            float tr = texture(u_dem, pos + vec2(dd, 0)).r;
            float bl = texture(u_dem, pos + vec2(0, dd)).r;
            float br = texture(u_dem, pos + vec2(dd, dd)).r;
            return u_exaggeration * mix(mix(tl, tr, f.x), mix(bl, br, f.x), f.y);
        #endif // TERRAIN_DEM_FLOAT_FORMAT
    }
    float prevElevation(vec2 apos) {
        #ifdef TERRAIN_DEM_FLOAT_FORMAT
            vec2 pos = (u_dem_size * (apos / 8192.0 * u_dem_scale_prev + u_dem_tl_prev) + 1.5) / (u_dem_size + 2.0);
            return u_exaggeration * texture(u_dem_prev, pos).r;
        #else // TERRAIN_DEM_FLOAT_FORMAT
            float dd = 1.0 / (u_dem_size + 2.0);
            vec4 r = tileUvToDemSample(apos / 8192.0, u_dem_size, u_dem_scale_prev, u_dem_tl_prev);
            vec2 pos = r.xy;
            vec2 f = r.zw;
            float tl = texture(u_dem_prev, pos).r;
            float tr = texture(u_dem_prev, pos + vec2(dd, 0)).r;
            float bl = texture(u_dem_prev, pos + vec2(0, dd)).r;
            float br = texture(u_dem_prev, pos + vec2(dd, dd)).r;
            return u_exaggeration * mix(mix(tl, tr, f.x), mix(bl, br, f.x), f.y);
        #endif // TERRAIN_DEM_FLOAT_FORMAT
    }
    #ifdef TERRAIN_VERTEX_MORPHING
        float elevation(vec2 apos) {
            #ifdef ZERO_EXAGGERATION
                return 0.0;
            #endif // ZERO_EXAGGERATION
            float nextElevation = currentElevation(apos);
            float prevElevation = prevElevation(apos);
            return mix(prevElevation, nextElevation, u_dem_lerp);
        }
    #else // TERRAIN_VERTEX_MORPHING
        float elevation(vec2 apos) {
            #ifdef ZERO_EXAGGERATION
                return 0.0;
            #endif // ZERO_EXAGGERATION
            return currentElevation(apos);
        }
    #endif // TERRAIN_VERTEX_MORPHING
    // BEGIN: code for fill-extrusion height offseting
    // When making changes here please also update associated JS ports in src/style/style_layer/fill-extrusion-style-layer.js
    // This is so that rendering changes are reflected on CPU side for feature querying.
    
    vec4 fourSample(vec2 pos, vec2 off) {
        float tl = texture(u_dem, pos).r;
        float tr = texture(u_dem, pos + vec2(off.x, 0.0)).r;
        float bl = texture(u_dem, pos + vec2(0.0, off.y)).r;
        float br = texture(u_dem, pos + off).r;
        return vec4(tl, tr, bl, br);
    }
    float flatElevation(vec2 pack) {
        vec2 apos = floor(pack / 8.0);
        vec2 span = 10.0 * (pack - apos * 8.0);
        vec2 uvTex = (apos - vec2(1.0, 1.0)) / 8190.0;
        float size = u_dem_size + 2.0;
        float dd = 1.0 / size;
        vec2 pos = u_dem_size * (uvTex * u_dem_scale + u_dem_tl) + 1.0;
        vec2 f = fract(pos);
        pos = (pos - f + 0.5) * dd;
        
        // Get elevation of centroid.
        
        vec4 h = fourSample(pos, vec2(dd));
        float z = mix(mix(h.x, h.y, f.x), mix(h.z, h.w, f.x), f.y);
        vec2 w = floor(0.5 * (span * u_meter_to_dem - 1.0));
        vec2 d = dd * w;
        
        // Get building wide sample, to get better slope estimate.
        
        h = fourSample(pos - d, 2.0 * d + vec2(dd));
        vec4 diff = abs(h.xzxy - h.ywzw);
        vec2 slope = min(vec2(0.25), u_meter_to_dem * 0.5 * (diff.xz + diff.yw) / (2.0 * w + vec2(1.0)));
        vec2 fix = slope * span;
        float base = z + max(fix.x, fix.y);
        return u_exaggeration * base;
    }
    float elevationFromUint16(float word) {
        return u_exaggeration * (word / ELEVATION_SCALE - ELEVATION_OFFSET);
    }
    // END: code for fill-extrusion height offseting
    
#else // TERRAIN
    
    float elevation(vec2 pos) {
        return 0.0;
    }
#endif

#ifdef DEPTH_OCCLUSION
    uniform highp sampler2D u_depth;
    uniform highp vec2 u_depth_size_inv;
    uniform highp vec2 u_depth_range_unpack;
    uniform highp float u_occluder_half_size;
    uniform highp float u_occlusion_depth_offset;
    #ifdef DEPTH_D24
        float unpack_depth(float depth) {
            return depth * u_depth_range_unpack.x + u_depth_range_unpack.y;
        }
        vec4 unpack_depth4(vec4 depth) {
            return depth * u_depth_range_unpack.x + vec4(u_depth_range_unpack.y);
        }
    #else // DEPTH_D24
        // Unpack depth from RGBA. A piece of code copied in various libraries and WebGL
        // shadow mapping examples.
        // https://aras-p.info/blog/2009/07/30/encoding-floats-to-rgba-the-final/
        highp float unpack_depth_rgba(vec4 rgba_depth) {
            const highp vec4 bit_shift = vec4(1.0 / (255.0 * 255.0 * 255.0), 1.0 / (255.0 * 255.0), 1.0 / 255.0, 1.0);
            return dot(rgba_depth, bit_shift) * 2.0 - 1.0;
        }
    #endif // DEPTH_D24
    bool isOccluded(vec4 frag) {
        vec3 coord = frag.xyz / frag.w;
        #ifdef DEPTH_D24
            float depth = unpack_depth(texture(u_depth, (coord.xy + 1.0) * 0.5).r);
        #else // DEPTH_D24
            float depth = unpack_depth_rgba(texture(u_depth, (coord.xy + 1.0) * 0.5));
        #endif // DEPTH_D24
        
        return coord.z + u_occlusion_depth_offset > depth;
    }
    highp vec4 getCornerDepths(vec2 coord) {
        highp vec3 df = vec3(u_occluder_half_size * u_depth_size_inv, 0.0);
        highp vec2 uv = 0.5 * coord.xy + 0.5;
        #ifdef DEPTH_D24
            highp vec4 depth = vec4(
            texture(u_depth, uv - df.xz).r, texture(u_depth, uv + df.xz).r, texture(u_depth, uv - df.zy).r, texture(u_depth, uv + df.zy).r
            );
            depth = unpack_depth4(depth);
        #else // DEPTH_D24
            highp vec4 depth = vec4(
            unpack_depth_rgba(texture(u_depth, uv - df.xz)), unpack_depth_rgba(texture(u_depth, uv + df.xz)), unpack_depth_rgba(texture(u_depth, uv - df.zy)), unpack_depth_rgba(texture(u_depth, uv + df.zy))
            );
        #endif // DEPTH_D24
        
        return depth;
    }
    // Used by symbols layer
    highp float occlusionFadeMultiSample(vec4 frag) {
        highp vec3 coord = frag.xyz / frag.w;
        highp vec2 uv = 0.5 * coord.xy + 0.5;
        int NX = 3;
        int NY = 4;
        
        // Half size offset
        
        highp vec2 df = u_occluder_half_size * u_depth_size_inv;
        highp vec2 oneStep = 2.0 * u_occluder_half_size * u_depth_size_inv / vec2(NX - 1, NY - 1);
        highp float res = 0.0;
        for (int y = 0; y < NY; ++y) {
            for (int x = 0; x < NX; ++x) {
                #ifdef DEPTH_D24
                    highp float depth = unpack_depth(texture(u_depth, uv - df + vec2(float(x) * oneStep.x, float(y) * oneStep.y)).r);
                #else // DEPTH_24
                    highp float depth = unpack_depth_rgba(texture(u_depth, uv - df + vec2(float(x) * oneStep.x, float(y) * oneStep.y)));
                #endif // DEPTH_24
                
                res += 1.0 - clamp(300.0 * (coord.z + u_occlusion_depth_offset - depth), 0.0, 1.0);
            }
    
        }
        res = clamp(2.0 * res / float(NX * NY) - 0.5, 0.0, 1.0);
        return res;
    }
    // Used by circles layer
    highp float occlusionFade(vec4 frag) {
        highp vec3 coord = frag.xyz / frag.w;
        highp vec4 depth = getCornerDepths(coord.xy);
        return dot(vec4(0.25), vec4(1.0) - clamp(300.0 * (vec4(coord.z + u_occlusion_depth_offset) - depth), 0.0, 1.0));
    }
#else // DEPTH_OCCLUSION
    bool isOccluded(vec4 frag) {
        return false;
    }
    highp float occlusionFade(vec4 frag) {
        return 1.0;
    }
    highp float occlusionFadeMultiSample(vec4 frag) {
        return 1.0;
    }
#endif // DEPTH_OCCLUSION
uniform mat4 u_matrix;
uniform float u_skirt_height;
in vec2 a_pos;
out vec2 v_pos0;
#ifdef FOG
    out float v_fog_opacity;
#endif

#ifdef RENDER_SHADOWS
    uniform mat4 u_light_matrix_0;
    uniform mat4 u_light_matrix_1;
    out vec4 v_pos_light_view_0;
    out vec4 v_pos_light_view_1;
    out float v_depth;
#endif

void main() {
    vec3 decomposedPosAndSkirt = decomposeToPosAndSkirt(a_pos);
    float skirt = decomposedPosAndSkirt.z;
    vec2 decodedPos = decomposedPosAndSkirt.xy;
    float elevation = elevation(decodedPos) - skirt * u_skirt_height;
    v_pos0 = decodedPos / 8192.0;
    gl_Position = u_matrix * vec4(decodedPos, elevation, 1.0);
    #ifdef FOG
        #ifdef ZERO_EXAGGERATION
            v_fog_pos = fog_position(decodedPos);
        #else
            v_fog_opacity = fog(fog_position(vec3(decodedPos, elevation)));
        #endif
    #endif
    
    #ifdef RENDER_SHADOWS
        vec3 pos = vec3(decodedPos, elevation);
        v_pos_light_view_0 = u_light_matrix_0 * vec4(pos, 1.);
        v_pos_light_view_1 = u_light_matrix_1 * vec4(pos, 1.);
    #endif
}