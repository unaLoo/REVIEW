#ifdef VERTEX_SHADER

#define PI 3.141592653589793
#define RAD_TO_DEG 180.0/PI
#define DEG_TO_RAD PI/180.0

precision highp float;

layout(location = 0) in vec2 a_pos;

uniform mat4 viewMatrix;
uniform mat4 projMatrix;
uniform mat4 u_matrix;

out vec4 world_pos;
out vec4 view_pos;
out vec4 clip_pos;
out vec4 screen_pos;

//////// functions ///////////
float mercatorXfromLng(float lng) {
    return (180.0 + lng) / 360.0;
}
float mercatorYfromLat(float lat) {
    return (180.0 - (RAD_TO_DEG * log(tan(PI / 4.0 + lat / 2.0 * DEG_TO_RAD)))) / 360.0;
}

void main() {
    vec2 pos = vec2(mercatorXfromLng(a_pos.x), mercatorYfromLat(a_pos.y));
    world_pos = vec4(pos, 0.0, 1.0);
    // view_pos = viewMatrix * world_pos;
    // clip_pos = projMatrix * view_pos;
    // mat4 vp = viewMatrix * projMatrix ;
    mat4 vp = u_matrix;
    clip_pos = vp * world_pos;
    // clip_pos = u_matrix * world_pos;
    // screen_pos = clip_pos / clip_pos.w;
    // gl_Position = u_matrix * vec4(pos, 0.0, 1.0);
    gl_Position = clip_pos;
}

#endif
#ifdef FRAGMENT_SHADER
precision highp float;

uniform vec2 iResolution; // in pixels
uniform float iTime; // in seconds
// uniform vec2 iMouse; // xy: current position, zw: click position

out vec4 fragColor;

#define DRAG_MULT 0.38 // changes how much waves pull on the water
#define WATER_DEPTH 1.0 // how deep is the water
#define CAMERA_HEIGHT 1.5 // how high the camera should be
#define ITERATIONS_RAYMARCH 12 // waves iterations of raymarching
#define ITERATIONS_NORMAL 36 // waves iterations when calculating normals
// #define NormalizedMouse (iMouse.xy / iResolution.xy) // normalize mouse coords

vec2 wavedx(vec2 position, vec2 direction, float frequency, float timeshift) {
    float x = dot(position, direction) * frequency + timeshift;
    float wave = exp(sin(x) - 1.0);
    float dx = wave * cos(x);
    return vec2(wave, -dx);
}

// 将多个不同尺度、频率的波形(octaves)叠加求和，计算水体波浪高度
float calcWave(vec2 position, int iterations) {
    float wavePhaseShift = length(position) * 0.1; // this is to avoid every octave having exactly the same phase everywhere
    float iter = 0.0; // this will help generating well distributed wave directions
    float frequency = 1.0; // frequency of the wave, this will change every iteration
    float timeMultiplier = 2.0; // time multiplier for the wave, this will change every iteration
    float weight = 1.0;// weight in final sum for the wave, this will change every iteration
    float sumOfValues = 0.0; // will store final sum of values
    float sumOfWeights = 0.0; // will store final sum of weights
    for(int i = 0; i < iterations; i++) {
    // generate some wave direction that looks kind of random
        vec2 p = vec2(sin(iter), cos(iter));

    // calculate wave data
        vec2 res = wavedx(position, p, frequency, iTime * timeMultiplier + wavePhaseShift);

    // shift position around according to wave drag and derivative of the wave
        position += p * res.y * weight * DRAG_MULT;

    // add the results to sums
        sumOfValues += res.x * weight;
        sumOfWeights += weight;

    // modify next octave ;
        weight = mix(weight, 0.0, 0.2);
        frequency *= 1.18;
        timeMultiplier *= 1.07;

    // add some kind of random value to make next wave look random too
        iter += 1232.399963;
    }
    // calculate and return
    return sumOfValues / sumOfWeights;
}

// 返回相机射线，想象以相机为原点出发的向量
vec3 getRay(vec2 fragCoord) {
    vec2 uv = ((fragCoord.xy / iResolution.xy) * 2.0 - 1.0) * vec2(iResolution.x / iResolution.y, 1.0);
    vec3 proj = normalize(vec3(uv.x, uv.y, CAMERA_HEIGHT));
    return proj;
}

// 计算射线和平面交点
vec3 intersectPlane(vec3 cameraPos, vec3 cameraRay, vec3 planePos, vec3 planeNormal) {
    // 射线与平面相交问题
    // 1. 射线定义 L = l0 + t * d, l0为起点，d为方向向量, t为任意正数， L构成了射线上的任意点
    vec3 l0 = cameraPos;
    vec3 d = normalize(cameraRay);
    // 2. 点法式平面定义, 过一个给定点，有且只有一个平面与给定法线垂直
    // 点法式 n * (p - p0) = 0 , n为法向量, p0为给定点, p为平面任意点, p - p0 构成了平面内任意向量
    vec3 n = planeNormal;
    vec3 p0 = planePos;
    // 3. 求解交点  点法式求解, 推导得到
    // vec3 t = (dot(p0, n) - dot(l0, n)) / dot(d, n);
    float t = (dot(p0 - l0, n)) / dot(d, n);
    t = clamp(t, 0.0, 9991999.0); // 限制t的范围

    // 4. 计算交点
    vec3 intersectionPoint = l0 + t * d;
    return intersectionPoint;
}

// 在两个hitpos之间进行raymarching, 获取wave的hitpos
float raymarchwater(vec3 cameraPos, vec3 highHitPos, vec3 lowHitPos, float waterDepth) {
    vec3 pos = highHitPos;
    vec3 dir = normalize(lowHitPos - highHitPos);
    for(int i = 0; i < 64; i++) {
        // 计算pos处的wave高度
        float height = (calcWave(pos.xz, ITERATIONS_RAYMARCH) - 1.0) * WATER_DEPTH; // (-depth, 0)
        // hit 判断
        if(height + 0.01 > pos.y) {
            return distance(pos, cameraPos);
        } else {
            pos += dir * (pos.y - height);
        }
    }
    return distance(highHitPos, cameraPos);
}

// 计算法向量, 取旁边偏移位置的两个点算高度，得到两个线，叉乘得到法向量
vec3 calcNormal(vec3 pos, float offset, float waterDepth) {

    /// main pos wave
    float height = calcWave(pos.xz, ITERATIONS_NORMAL) * waterDepth; // (0 -> depth)
    vec3 wavePosMain = vec3(pos.x, height, pos.z);

    /////////////////// in the plane of xz
    // |  --   |   --  |  --  | 
    // | oPos1 |  Mpos |  --  |
    // |  --   | oPos2 |  --  |
    //////////////////
    vec3 offsetPos1 = vec3(pos.x - offset, 0.0, pos.z);
    vec3 offsetPos2 = vec3(pos.x, 0.0, pos.z + offset);

    float height1 = calcWave(offsetPos1.xz, ITERATIONS_NORMAL) * waterDepth;
    float height2 = calcWave(offsetPos2.xz, ITERATIONS_NORMAL) * waterDepth;

    vec3 wavePos1 = vec3(offsetPos1.x, height1, offsetPos1.z);
    vec3 wavePos2 = vec3(offsetPos2.x, height2, offsetPos2.z);

    vec3 normal = normalize(cross(wavePos1 - wavePosMain, wavePos2 - wavePosMain));

    return normal;
}

void main() {

    vec2 fragCoord = gl_FragCoord.xy;
    vec3 ray = getRay(fragCoord);

    fragColor = vec4(ray, 1.0);
    return;

    //////// render the sky
    if(ray.y >= 0.0) {
        vec3 skyColorbottom = vec3(0.47, 0.73, 1.0);
        vec3 skyColortop = vec3(0.0, 0.24, 0.44);
        fragColor = mix(vec4(skyColorbottom, 1.0), vec4(skyColortop, 1.0), ray.y);
        return;
    }

    ///////// render water

    // positions in world space
    vec3 waterPlaneHigh = vec3(0.0, 0.0, 0.0);
    vec3 waterPlaneLow = vec3(0.0, -1.0 * WATER_DEPTH, 0.0);
    vec3 cameraPos = vec3(0.5, CAMERA_HEIGHT, 1.0);

    // calculate intersection of ray with water plane
    vec3 highPlaneHitPos = intersectPlane(cameraPos, ray, waterPlaneHigh, vec3(0.0, 1.0, 0.0));
    vec3 lowPlaneHitPos = intersectPlane(cameraPos, ray, waterPlaneLow, vec3(0.0, 1.0, 0.0));

    // raymarch the wave hit pos
    float dist = raymarchwater(cameraPos, highPlaneHitPos, lowPlaneHitPos, WATER_DEPTH);
    vec3 waterHitPos = cameraPos + ray * dist;

    // calculate normal
    vec3 normal = calcNormal(waterHitPos, 0.01, WATER_DEPTH);

    // smooth the normal with distance to avoid disturbing high frequency noise
    normal = mix(normal, vec3(0.0, 1.0, 0.0), 0.8 * min(1.0, sqrt(dist * 0.01) * 1.1));

    // ray 是 视线向量, normal是水面像元的法向量, R是反射向量, 应根据R取得反射颜色
    vec3 R = normalize(reflect(ray, normal));
    R.y = abs(R.y); // 限制R的y分量的范围

    ////// temp ///////
    vec3 skyColorbottom = vec3(0.47, 0.73, 1.0);
    vec3 skyColortop = vec3(0.0, 0.24, 0.44);
    vec3 finalReflectColor = mix(skyColorbottom, skyColortop, R.y);

    fragColor = vec4(finalReflectColor, 1.0);
    // fragColor = vec4(0.0, 0.0, 0.0, 1.0);

    ///////// DEBUG ///////////
    // vec3 sunPosition = vec3(0.2, 10.0, 0.1);
    // vec3 sunColor = vec3(0.0, 0.47, 0.73);
    // vec3 sunDir = normalize(sunPosition - waterHitPos);
    // float sunDot = max(dot(normal, sunDir), 0.0);
    // vec3 sun = sunColor * sunDot;
    // fragColor = vec4(sun, 1.0);
    // fragColor = vec4(normal, 1.0);
    // fragColor = vec4(R, 1.0);

    // vec2 mouseCoord = vec2(NormalizedMouse.x, 1.0 - NormalizedMouse.y);
    // vec2 screenCoord = fragCoord / iResolution;

    // fragColor = vec4( fragCoord/ iResolution, 0.0, 1.0);
    // fragColor = vec4(0.5, 0.5, 0.4, 1.0);

    // if(distance(screenCoord, mouseCoord) < 0.005) {
    //     fragColor = vec4(1.0, 0.0, 0.0, 1.0);
    // }

}
#endif