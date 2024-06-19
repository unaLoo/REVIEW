#version 300 es

// global uniform
uniform vec4 mapExtent;
uniform vec4 flowExtent;
uniform mat4 u_matrix;
uniform ivec2 particlePoolSize;

// status 
uniform float progresRate;
uniform float maxSpeed;
uniform float randomSeed;

// particle control
uniform int particleNum;
uniform float dropRate;
uniform float dropRateBump;
uniform float speedFactor;

uniform sampler2D particlePoolTexture;
uniform sampler2D uvTexture;

const float PI = 3.14159265359f;
const float EARTH_RADIUS = 6371000.0f;

/// tool func
vec2 lnglat2Mercator(float lng, float lat) {
    float x = (180.0f + lng) / 360.0f;
    float y = (180.0f - (180.0f / PI) * log(tan(PI / 4.0f + (lat * PI) / 360.0f))) / 360.0f;
    return vec2(x, y);
}
vec2 uvCorrect(vec2 uv, vec2 dim) {
    return clamp(uv, vec2(0.0f, 0.0f), dim - vec2(1.0f, 1.0f));
}
float rand(vec2 co) {
    vec3 rand_constants = vec3(12.9898f, 78.233f, 4375.85453f);
    float t = dot(rand_constants.xy, co);
    return abs(fract(sin(t) * (rand_constants.z + t)));
}
vec4 currentExtent() {
    float lonMin = max(flowExtent.x, mapExtent.x);
    float latMin = max(flowExtent.y, mapExtent.y);
    float lonMax = min(flowExtent.z, mapExtent.z);
    float latMax = min(flowExtent.w, mapExtent.w);
    return vec4(lonMin, latMin, lonMax, latMax);
}

/// main func

vec2 calculateDisplacedLonLat(float lon, float lat, float offsetX, float offsetY) {
    float latRad = radians(lat);
    float lonRad = radians(lon);

    float newLatRad = latRad + (offsetY / EARTH_RADIUS);
    float newLat = degrees(newLatRad);

    float radiusAtLat = EARTH_RADIUS * cos(latRad);
    float newLonRad = lonRad + (offsetX / radiusAtLat);
    float newLon = degrees(newLonRad);

    return vec2(newLon, newLat);
}

bool validExtentCheck(vec2 pos, vec4 extent) {
    if(pos.x <= extent.x || pos.x >= extent.z || pos.y <= extent.y || pos.y >= extent.w) {
        return false;
    }
    return true;
}

void main() {

    vec4 cExtent = currentExtent();
    int particleIndex = gl_InstanceID;
    if(cExtent.z <= cExtent.x || cExtent.w <= cExtent.y || particleIndex >= particleNum) {
        return;
    }

    int particlePoolX = int(particleIndex % particlePoolSize.x);
    int particlePoolY = int(float(particleIndex) / float(particlePoolSize.x));
    ivec2 particlePoolCoord = ivec2(particlePoolX, particlePoolY);

    vec2 nowPos = texelFetch(particlePoolTexture, particlePoolCoord, 0).rg;
    vec2 seed = randomSeed * nowPos;

    if(!validExtentCheck(nowPos, cExtent)) {
        // vec2f(rand(seed + id.x), rand(seed + id.y));
        vec2 rebirthPos = vec2(rand(seed + randomSeed), rand(seed - randomSeed));
        
    }
}