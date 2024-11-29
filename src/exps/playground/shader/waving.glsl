#ifdef VERTEX_SHADER
// full screen quad
precision highp float;

vec4[] vertices = vec4[4](vec4(-1.0, -1.0, 0.0, 0.0), vec4(1.0, -1.0, 1.0, 0.0), vec4(-1.0, 1.0, 0.0, 1.0), vec4(1.0, 1.0, 1.0, 1.0));
void main() {
    vec4 attributes = vertices[gl_VertexID];
    gl_Position = vec4(attributes.xy, 0.0, 1.0);
}
#endif

#ifdef FRAGMENT_SHADER

precision highp float;

uniform vec3 iResolution; // in pixels
uniform float iTime; // in seconds
uniform vec4 iMouse; // xy: current position, zw: click position

out vec4 fragColor;

#define DRAG_MULT 0.38 // changes how much waves pull on the water
#define WATER_DEPTH 1.0 // how deep is the water
#define CAMERA_HEIGHT 1.5 // how high the camera should be
#define ITERATIONS_RAYMARCH 12 // waves iterations of raymarching
#define ITERATIONS_NORMAL 36 // waves iterations when calculating normals
#define NormalizedMouse (iMouse.xy / iResolution.xy) // normalize mouse coords

// 将多个不同尺度、频率的波形(octaves)叠加求和，计算水体波浪高度
float calcWave(vec2 position, int iterations) {

    return 0.0;
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
vec3 raymarchwater(vec3 cameraPos, vec3 highHitPos, vec3 lowHitPos, float waterDepth) {
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
    float height = calcWave(pos.xz, ITERATIONS_NORMAL) * WATER_DEPTH; // (0 -> depth)
    vec3 wavePosMain = vec3(pos.x, height, pos.z);

    /////////////////// in the plane of xz
    // |  --   |   --  |  --  | 
    // | oPos1 |  Mpos |  --  |
    // |  --   | oPos2 |  --  |
    //////////////////
    vec3 offsetPos1 = vec3(pos.x - offset, 0.0, pos.z);
    vec3 offsetPos2 = vec3(pos.x, 0.0, pos.z + offset);

    float height1 = calcWave(offsetPos1.xz, ITERATIONS_NORMAL) * WATER_DEPTH;
    float height2 = calcWave(offsetPos2.xz, ITERATIONS_NORMAL) * WATER_DEPTH;

    vec3 wavePos1 = vec3(offsetPos1.x, height1, offsetPos1.z);
    vec3 wavePos2 = vec3(offsetPos2.x, height2, offsetPos2.z);

    vec3 normal = normalize(cross(wavePos2 - wavePosMain, wavePos1 - wavePosMain));

    return normal;

}

void main() {

    vec2 fragCoord = gl_FragCoord.xy;
    vec3 ray = getRay(fragCoord);

    ////////// render the sky
    if(ray.y >= 0.0) {
        fragColor = vec4(0.0, 0.0, 0.6 + ray.y * 0.4, 0.5);
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
    float waterHitPos = cameraPos + ray * dist;

    vec3 normal = calcNormal(waterHitPos, 0.01, WATER_DEPTH);


    /// just ....


    ///////// DEBUG ///////////
    fragColor = vec4(normal, 1.0);



}

#endif