#version 300 es

in vec3 a_particleInfo;//(x,y,velocity)

// global uniform
uniform vec4 mapExtent;
uniform vec4 flowExtent;
uniform mat4 u_matrix;

// status 
uniform float maxSpeed;
uniform float randomSeed;

// particle control
uniform int particleNum;
uniform float dropRate;
uniform float dropRateBump;
uniform float speedFactor;

uniform sampler2D uvTexture;

out vec3 out_particleInfo;//(x,y,velocity)

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
float drop(vec2 velocity, vec2 seed) {
    float speedRate = length(velocity) / maxSpeed;
    float drop_rate = dropRate + speedRate * dropRateBump;
    return step(1.0f - drop_rate, rand(seed));
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

vec2 getVelocity(vec2 uv) {
    vec2 dimention = vec2(textureSize(uvTexture, 0));
    vec2 uvCorrected = uvCorrect(uv, dimention);
    vec2 uvSpeed = texture(uvTexture, uvCorrected).rg;
    return uvSpeed;
    // float speed = mix(0.0f, maxSpeed, length(uvSpeed));
    // return speed * speedFactor;
}

void main() {

    vec4 cExtent = currentExtent();
    int particleIndex = gl_VertexID;
    // if(cExtent.z <= cExtent.x || cExtent.w <= cExtent.y || particleIndex >= particleNum) {
    //     return;
    // }
    

    // vec2 nowPos = a_particleInfo.xy;// 0-1
    // float nowSpeed = a_particleInfo.z;
    // vec2 seed = randomSeed * nowPos;

    // if(!validExtentCheck(nowPos, cExtent)) {
    //     vec2 rebirthPos = vec2(rand(seed + randomSeed), rand(seed - randomSeed));
    //     float x = mix(cExtent.x, cExtent.z, rebirthPos.x);
    //     float y = mix(cExtent.y, cExtent.w, rebirthPos.y);
    //     out_particleInfo = vec3(x, y, 0.0f);// 0-1
    //     return;
    // }
    // out_particleInfo = a_particleInfo;// 0-1

    // vec2 mercatorPos = lnglat2Mercator(nowPos.x, nowPos.y);
    // vec4 posinCS = u_matrix * vec4(mercatorPos, 0.0f, 1.0f);
    // vec2 posInSS = posinCS.xy / posinCS.w;
    // vec2 uv = (posInSS + 1.0f) / 2.0f;
    // uv = vec2(uv.x, 1.0f - uv.y);
    // vec2 uvSpeed = getVelocity(uv);
    // vec2 newPos = calculateDisplacedLonLat(nowPos.x, nowPos.y, uvSpeed.x, uvSpeed.y);
    // newPos = clamp(newPos, cExtent.xy, cExtent.zw);

    // if(drop(uvSpeed, seed) == 1.0f || uv.x * uv.y == 0.0f || !validExtentCheck(newPos, cExtent)) {
    //     vec2 rebirthPos = vec2(rand(seed + randomSeed), rand(seed - randomSeed));
    //     float x = mix(cExtent.x, cExtent.z, rebirthPos.x);
    //     float y = mix(cExtent.y, cExtent.w, rebirthPos.y);
    //     out_particleInfo = vec3(x, y, 0.0f);
    // }else{
    //     out_particleInfo = vec3(newPos.x, newPos.y, length(uvSpeed) * speedFactor);  
    // }

    //// test
    float x = clamp(a_particleInfo.x + 0.0001, 0.8, 0.9);
    float y = clamp(a_particleInfo.y + 0.0001, 0.4, 0.5);

    out_particleInfo = vec3(
        x,
        y,
        0.5f
    );

}