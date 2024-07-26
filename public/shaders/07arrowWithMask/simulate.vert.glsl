#version 300 es

in vec2 a_startPos;//(x,y)

// global uniform
uniform vec4 mapExtent;
uniform vec4 flowExtent;
uniform mat4 u_matrix;

uniform float speedFactor;

uniform sampler2D uvTexture;

out vec2 out_endPos;//(x,y)

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

bool validExtent(vec4 rect1, vec4 rect2) {
    // rect：(xmin,ymin,xmax,ymax)
    if(rect1.x >= rect2.z || rect1.z <= rect2.x || rect1.y >= rect2.w || rect1.w <= rect2.y) {
        return false;
    }
    return true;
}

vec4 currentExtent() {
    float lonMin = max(flowExtent.x, mapExtent.x);
    float latMin = max(flowExtent.y, mapExtent.y);
    float lonMax = min(flowExtent.z, mapExtent.z);
    float latMax = min(flowExtent.w, mapExtent.w);
    return vec4(lonMin, latMin, lonMax, latMax);
    // return flowExtent;
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
}

void main() {

    vec4 cExtent = currentExtent();
    vec2 nowPos = a_startPos;//lng lat

    // Bounding box check && Particle now postion check
    if(!validExtent(flowExtent, mapExtent) || !validExtentCheck(nowPos, cExtent)) {
        out_endPos = nowPos;
        return;
    }

    vec2 mercatorPos = lnglat2Mercator(nowPos.x, nowPos.y);
    vec4 posinCS = u_matrix * vec4(mercatorPos, 0.0f, 1.0f);
    vec2 posInSS = posinCS.xy / posinCS.w;
    vec2 uv = (posInSS + 1.0f) / 2.0f;
    vec2 uvSpeed = getVelocity(uv);
    vec2 newPos = calculateDisplacedLonLat(nowPos.x, nowPos.y, uvSpeed.x * speedFactor, uvSpeed.y * speedFactor);
    newPos = clamp(newPos, cExtent.xy, cExtent.zw);

    if(all(lessThan(abs(uvSpeed), vec2(0.001f))) || !validExtentCheck(newPos, cExtent)) {
        out_endPos = nowPos; // same point no render
    } else {
        out_endPos = newPos;
    }
  
    //// test
    // float x = clamp(a_particleInfo.x + 0.0001f, 0.0f, 0.9f);
    // float y = clamp(a_particleInfo.y + 0.0001f, 0.0f, 0.9f);
    // float x = a_particleInfo.x + 0.0001f;
    // float y = a_particleInfo.y + 0.0001f;

    // vec2 new_fromPos = a_particleInfo.zw;
    // vec2 new_toPos = a_particleInfo.zw + vec2(0.001,0.001);
    // out_particleInfo = vec4(new_fromPos, new_toPos);
    // out_verlocity = 0.0f;
}